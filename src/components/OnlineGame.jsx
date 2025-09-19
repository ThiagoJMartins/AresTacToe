import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { TURNS, TURN_ICONS, createEmptyBoard, getIconForValue } from "./constants";
import { Square } from "./square";

const STEPS = {
  USERNAME: "username",
  MODE: "mode",
  ROOM: "room",
  WAITING: "waiting",
  PLAYING: "playing",
};

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001";

const createInitialState = () => ({
  board: createEmptyBoard(),
  turn: TURNS.X,
  winner: null,
});

export function OnlineGame({ onGoHome }) {
  const [step, setStep] = useState(STEPS.USERNAME);
  const [username, setUsername] = useState("");
  const [action, setAction] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [password, setPassword] = useState("");
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [gameState, setGameState] = useState(createInitialState);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [players, setPlayers] = useState([]);
  const [opponentName, setOpponentName] = useState("");
  const [connectionState, setConnectionState] = useState("disconnected");

  const socketRef = useRef(null);
  const playerSymbolRef = useRef(null);
  const stepRef = useRef(STEPS.USERNAME);

  const updateStep = useCallback((newStep) => {
    stepRef.current = newStep;
    setStep(newStep);
  }, []);

  const resetLocalState = useCallback(() => {
    setGameState(createInitialState());
    setPlayerSymbol(null);
    playerSymbolRef.current = null;
    setStatusMessage("");
    setPlayers([]);
    setOpponentName("");
  }, []);

  const cleanupConnection = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    socketRef.current = null;
    setConnectionState("disconnected");
  }, []);

  useEffect(() => () => cleanupConnection(), [cleanupConnection]);

  const sendMessage = useCallback((type, payload = {}) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const handleServerMessage = useCallback(
    (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.error("Mensaje de servidor inválido", error);
        return;
      }

      const { type, payload } = data;

      switch (type) {
        case "error":
          setErrorMessage(payload?.message ?? "Ocurrió un error.");
          if (payload?.reset) {
            resetLocalState();
            updateStep(STEPS.MODE);
          }
          break;
        case "room_created": {
          const roomBoard = payload?.board ?? createEmptyBoard();
          const roomTurn = payload?.turn ?? TURNS.X;
          const symbol = payload?.symbol ?? TURNS.X;
          const currentPlayers = payload?.players ?? [];

          playerSymbolRef.current = symbol;
          setPlayerSymbol(symbol);
          setGameState({ board: roomBoard, turn: roomTurn, winner: null });
          setPlayers(currentPlayers);
          setStatusMessage(
            "Sala creada. Compartí el código y la contraseña para invitar a alguien.",
          );
          updateStep(STEPS.WAITING);
          break;
        }
        case "room_joined": {
          const roomBoard = payload?.board ?? createEmptyBoard();
          const roomTurn = payload?.turn ?? TURNS.X;
          const symbol = payload?.symbol ?? TURNS.O;
          const currentPlayers = payload?.players ?? [];

          playerSymbolRef.current = symbol;
          setPlayerSymbol(symbol);
          setGameState({ board: roomBoard, turn: roomTurn, winner: null });
          setPlayers(currentPlayers);
          const opponent = currentPlayers.find((player) => player.symbol !== symbol);
          setOpponentName(opponent?.username ?? "");
          setStatusMessage("Te uniste a la sala. ¡A jugar!");
          updateStep(STEPS.PLAYING);
          break;
        }
        case "player_joined": {
          const currentPlayers = payload?.players ?? [];
          setPlayers(currentPlayers);
          const symbol = playerSymbolRef.current;
          const opponent = currentPlayers.find((player) => player.symbol !== symbol);
          setOpponentName(opponent?.username ?? "");
          setStatusMessage(`${payload?.username ?? "Un jugador"} se unió a la sala.`);
          if (stepRef.current === STEPS.WAITING) {
            updateStep(STEPS.PLAYING);
          }
          break;
        }
        case "player_left": {
          const currentPlayers = payload?.players ?? [];
          setPlayers(currentPlayers);
          setOpponentName("");
          setStatusMessage(`${payload?.username ?? "Un jugador"} salió de la sala.`);
          setGameState({
            board: payload?.board ?? createEmptyBoard(),
            turn: payload?.turn ?? TURNS.X,
            winner: null,
          });
          updateStep(STEPS.WAITING);
          break;
        }
        case "game_state": {
          const winner = payload?.winner ?? null;
          setGameState({
            board: payload?.board ?? createEmptyBoard(),
            turn: payload?.turn ?? TURNS.X,
            winner,
          });
          if (winner && winner !== "draw" && winner === playerSymbolRef.current) {
            confetti();
          }
          if (winner === "draw") {
            setStatusMessage("La partida terminó en empate.");
          } else if (winner) {
            setStatusMessage(
              winner === playerSymbolRef.current
                ? "¡Ganaste la partida!"
                : "Tu rival ganó la partida.",
            );
          } else {
            setStatusMessage(
              playerSymbolRef.current === payload?.turn
                ? "Es tu turno."
                : "Esperando al rival...",
            );
          }
          break;
        }
        case "room_closed": {
          setErrorMessage(payload?.message ?? "La sala se cerró.");
          resetLocalState();
          cleanupConnection();
          updateStep(STEPS.MODE);
          break;
        }
        default:
          console.warn("Tipo de mensaje no soportado", type);
      }
    },
    [cleanupConnection, resetLocalState, updateStep],
  );

  const handleConnect = useCallback(() => {
    cleanupConnection();
    setErrorMessage("");

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;
    setConnectionState("connecting");
    setStatusMessage("Conectando al servidor...");

    socket.addEventListener("open", () => {
      setConnectionState("connected");
      const type = action === "create" ? "create_room" : "join_room";
      socket.send(
        JSON.stringify({
          type,
          payload: {
            code: roomCode.trim(),
            password: password.trim(),
            username: username.trim(),
          },
        }),
      );
    });

    socket.addEventListener("message", handleServerMessage);

    socket.addEventListener("close", () => {
      setConnectionState("disconnected");
      socketRef.current = null;
      if (stepRef.current === STEPS.PLAYING || stepRef.current === STEPS.WAITING) {
        setErrorMessage("Conexión cerrada con el servidor.");
        resetLocalState();
        updateStep(STEPS.MODE);
      }
    });

    socket.addEventListener("error", (event) => {
      console.error("Error en la conexión WebSocket", event);
      setErrorMessage("No se pudo establecer la conexión con el servidor.");
    });
  }, [action, handleServerMessage, password, roomCode, username, cleanupConnection, resetLocalState, updateStep]);

  const handleUsernameSubmit = (event) => {
    event.preventDefault();
    if (!username.trim()) {
      setErrorMessage("Ingresá un nombre de usuario.");
      return;
    }
    setErrorMessage("");
    updateStep(STEPS.MODE);
  };

  const handleRoomSubmit = (event) => {
    event.preventDefault();
    if (!roomCode.trim() || !password.trim()) {
      setErrorMessage("Completá el código y la contraseña de la sala.");
      return;
    }
    setErrorMessage("");
    handleConnect();
  };

  const handleSelectMode = (selected) => {
    setAction(selected);
    updateStep(STEPS.ROOM);
  };

  const handleBackToMode = () => {
    cleanupConnection();
    resetLocalState();
    setRoomCode("");
    setPassword("");
    setErrorMessage("");
    updateStep(STEPS.MODE);
  };

  const handleLeaveRoom = () => {
    sendMessage("leave_room", { code: roomCode.trim() });
    cleanupConnection();
    resetLocalState();
    setRoomCode("");
    setPassword("");
    setStatusMessage("");
    setErrorMessage("");
    updateStep(STEPS.MODE);
  };

  const handleResetMatch = () => {
    sendMessage("reset_game", { code: roomCode.trim() });
  };

  const handleMove = (index) => {
    if (gameState.board[index] !== null) return;
    sendMessage("make_move", { code: roomCode.trim(), index });
  };

  const handleReturnHome = () => {
    handleLeaveRoom();
    setUsername("");
    setAction(null);
    setStatusMessage("");
    setErrorMessage("");
    updateStep(STEPS.USERNAME);
    onGoHome();
  };

  const isPlayerTurn = useMemo(
    () =>
      playerSymbol &&
      gameState.turn === playerSymbol &&
      gameState.winner === null &&
      connectionState === "connected" &&
      players.length === 2,
    [connectionState, gameState.turn, gameState.winner, playerSymbol, players.length],
  );

  const currentOpponent = useMemo(() => {
    if (players.length < 2) return opponentName;
    const symbol = playerSymbolRef.current;
    const opponent = players.find((player) => player.symbol !== symbol);
    return opponent?.username ?? opponentName;
  }, [opponentName, players]);

  useEffect(() => {
    if (!username) return;
    const currentPlayer = players.find((player) => player.username === username);
    if (currentPlayer && currentPlayer.symbol !== playerSymbolRef.current) {
      playerSymbolRef.current = currentPlayer.symbol;
      setPlayerSymbol(currentPlayer.symbol);
    }
  }, [players, username]);

  return (
    <section className="board online-board">
      <header className="board-header">
        <button type="button" onClick={handleReturnHome} className="secondary-button">
          Volver al inicio
        </button>
        <h2>Juego online</h2>
      </header>

      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {statusMessage && <div className="status-message">{statusMessage}</div>}

      {step === STEPS.USERNAME && (
        <form className="form-card" onSubmit={handleUsernameSubmit}>
          <label htmlFor="username">Nombre de usuario</label>
          <input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Ingresá tu nombre"
            required
          />
          <button type="submit">Continuar</button>
        </form>
      )}

      {step === STEPS.MODE && (
        <div className="mode-buttons inline">
          <button type="button" className="mode-button" onClick={() => handleSelectMode("create")}>
            Crear sala
          </button>
          <button type="button" className="mode-button" onClick={() => handleSelectMode("join")}>
            Unirse a una sala
          </button>
        </div>
      )}

      {step === STEPS.ROOM && (
        <form className="form-card" onSubmit={handleRoomSubmit}>
          <label htmlFor="roomCode">Código de sala</label>
          <input
            id="roomCode"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="Ej: ARES01"
            maxLength={10}
            required
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña de la sala"
            required
          />

          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={handleBackToMode}>
              Atrás
            </button>
            <button type="submit">{action === "create" ? "Crear" : "Unirse"}</button>
          </div>
        </form>
      )}

      {(step === STEPS.WAITING || step === STEPS.PLAYING) && (
        <div className="online-wrapper">
          <div className="online-meta">
            <p>
              <strong>Sala:</strong> {roomCode || "-"}
            </p>
            <p>
              <strong>Conexión:</strong> {connectionState}
            </p>
            <p>
              <strong>Vos:</strong> {username || "-"} {playerSymbol ? `(${TURN_ICONS[playerSymbol]})` : ""}
            </p>
            <p>
              <strong>Rival:</strong> {currentOpponent || "Esperando jugador"}
            </p>
          </div>

          <section className="game">
            {gameState.board.map((square, index) => (
              <Square
                key={index}
                index={index}
                updateBoard={handleMove}
                disabled={!isPlayerTurn}
              >
                {getIconForValue(square)}
              </Square>
            ))}
          </section>

          <section className="turn">
            <Square isSelected={gameState.turn === TURNS.X} disabled>
              {TURN_ICONS[TURNS.X]}
            </Square>
            <Square isSelected={gameState.turn === TURNS.O} disabled>
              {TURN_ICONS[TURNS.O]}
            </Square>
          </section>

          <div className="online-actions">
            <button type="button" onClick={handleResetMatch} disabled={players.length < 2}>
              Reiniciar partida
            </button>
            <button type="button" className="danger-button" onClick={handleLeaveRoom}>
              Salir de la sala
            </button>
          </div>

          {gameState.winner && (
            <div className="winner-banner">
              {gameState.winner === "draw"
                ? "La partida terminó en empate."
                : gameState.winner === playerSymbol
                  ? "¡Ganaste la partida!"
                  : "Tu rival ganó la partida."}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

OnlineGame.propTypes = {
  onGoHome: PropTypes.func.isRequired,
};
