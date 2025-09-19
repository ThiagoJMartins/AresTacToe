/* eslint-env node */
import { randomUUID } from "crypto";
import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.PORT ?? 3001);

const winnerCombos = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const createEmptyBoard = () => Array(9).fill(null);

const checkWinner = (board) => {
  for (const combo of winnerCombos) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
};

const isDraw = (board) => board.every((cell) => cell !== null);

const getNextTurn = (turn) => (turn === "X" ? "O" : "X");

const rooms = new Map();

const getPlayersInfo = (room) =>
  Array.from(room.players.values()).map(({ username, symbol }) => ({
    username,
    symbol,
  }));

const broadcast = (room, message, excludeId = null) => {
  const data = JSON.stringify(message);
  room.players.forEach((player, id) => {
    if (excludeId && id === excludeId) return;
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  });
};

const server = new WebSocketServer({ port: PORT });

console.log(`WebSocket listening on ws://localhost:${PORT}`);

server.on("connection", (ws) => {
  const clientId = randomUUID();
  let currentRoomCode = null;

  const send = (type, payload = {}) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  };

  const leaveCurrentRoom = (reason = "disconnect") => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) {
      currentRoomCode = null;
      return;
    }

    const player = room.players.get(clientId);
    room.players.delete(clientId);

    if (room.players.size === 0) {
      rooms.delete(currentRoomCode);
    } else {
      room.board = createEmptyBoard();
      room.turn = "X";
      room.winner = null;
      broadcast(room, {
        type: "player_left",
        payload: {
          username: player?.username ?? "Jugador",
          players: getPlayersInfo(room),
          board: room.board,
          turn: room.turn,
          reason,
        },
      });
    }

    currentRoomCode = null;
  };

  ws.on("message", (rawMessage) => {
    let data;
    try {
      data = JSON.parse(rawMessage.toString());
    } catch (error) {
      send("error", { message: "Mensaje inválido." });
      return;
    }

    const { type, payload } = data;

    switch (type) {
      case "create_room": {
        leaveCurrentRoom("replace");
        const code = String(payload?.code ?? "").trim().toUpperCase();
        const password = String(payload?.password ?? "").trim();
        const username = String(payload?.username ?? "").trim();

        if (!code || !password || !username) {
          send("error", { message: "Código, contraseña y nombre son obligatorios." });
          return;
        }

        const existingRoom = rooms.get(code);
        if (existingRoom && existingRoom.players.size > 0) {
          send("error", { message: "Ya existe una sala activa con ese código." });
          return;
        }

        const room = {
          code,
          password,
          board: createEmptyBoard(),
          turn: "X",
          winner: null,
          players: new Map(),
        };

        rooms.set(code, room);

        const playerData = {
          id: clientId,
          ws,
          username,
          symbol: "X",
        };

        room.players.set(clientId, playerData);
        currentRoomCode = code;

        send("room_created", {
          code,
          symbol: playerData.symbol,
          board: room.board,
          turn: room.turn,
          players: getPlayersInfo(room),
        });
        break;
      }

      case "join_room": {
        leaveCurrentRoom("replace");
        const code = String(payload?.code ?? "").trim().toUpperCase();
        const password = String(payload?.password ?? "").trim();
        const username = String(payload?.username ?? "").trim();

        if (!code || !password || !username) {
          send("error", { message: "Código, contraseña y nombre son obligatorios." });
          return;
        }

        const room = rooms.get(code);
        if (!room) {
          send("error", { message: "No existe una sala con ese código." });
          return;
        }

        if (room.password !== password) {
          send("error", { message: "Contraseña incorrecta." });
          return;
        }

        if (room.players.size >= 2) {
          send("error", { message: "La sala ya está completa." });
          return;
        }

        const symbol = room.players.size === 0 ? "X" : "O";
        const playerData = {
          id: clientId,
          ws,
          username,
          symbol,
        };

        room.players.set(clientId, playerData);
        currentRoomCode = code;

        send("room_joined", {
          code,
          symbol,
          board: room.board,
          turn: room.turn,
          players: getPlayersInfo(room),
        });

        broadcast(
          room,
          {
            type: "player_joined",
            payload: {
              username,
              players: getPlayersInfo(room),
            },
          },
          clientId,
        );
        break;
      }

      case "make_move": {
        if (currentRoomCode === null) {
          send("error", { message: "No estás en una sala." });
          return;
        }

        const room = rooms.get(currentRoomCode);
        if (!room) {
          send("error", { message: "La sala ya no está disponible." });
          return;
        }

        const player = room.players.get(clientId);
        if (!player) {
          send("error", { message: "No estás en esta sala." });
          return;
        }

        const index = Number(payload?.index);
        if (!Number.isInteger(index) || index < 0 || index > 8) {
          send("error", { message: "Movimiento inválido." });
          return;
        }

        if (room.winner) {
          return;
        }

        if (room.board[index] !== null) {
          return;
        }

        if (player.symbol !== room.turn) {
          send("error", { message: "No es tu turno." });
          return;
        }

        room.board[index] = player.symbol;
        const winner = checkWinner(room.board);

        if (winner) {
          room.winner = winner;
          room.turn = null;
        } else if (isDraw(room.board)) {
          room.winner = "draw";
          room.turn = null;
        } else {
          room.turn = getNextTurn(room.turn);
        }

        broadcast(room, {
          type: "game_state",
          payload: {
            board: room.board,
            turn: room.turn,
            winner: room.winner,
          },
        });
        break;
      }

      case "reset_game": {
        if (currentRoomCode === null) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;

        room.board = createEmptyBoard();
        room.turn = "X";
        room.winner = null;

        broadcast(room, {
          type: "game_state",
          payload: {
            board: room.board,
            turn: room.turn,
            winner: room.winner,
          },
        });
        break;
      }

      case "leave_room": {
        leaveCurrentRoom("leave");
        break;
      }

      default:
        send("error", { message: "Acción no reconocida." });
    }
  });

  ws.on("close", () => {
    leaveCurrentRoom("disconnect");
  });
});
