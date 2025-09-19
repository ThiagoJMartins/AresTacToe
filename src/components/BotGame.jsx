import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import {
  TURNS,
  TURN_ICONS,
  checkEndGame,
  checkWinner,
  createEmptyBoard,
  getIconForValue,
  getNextTurn,
} from "./constants";
import { Square } from "./square";

const BOT_DELAY = 600;

const DIFFICULTIES = [
  { id: "easy", label: "Fácil" },
  { id: "medium", label: "Intermedio" },
  { id: "hard", label: "Difícil" },
];

const minimax = (
  board,
  depth,
  isMaximizing,
  botSymbol,
  humanSymbol,
  maxDepth = null,
) => {
  const winner = checkWinner(board);
  if (winner === botSymbol) return 10 - depth;
  if (winner === humanSymbol) return depth - 10;
  if (checkEndGame(board)) return 0;

  if (maxDepth !== null && depth >= maxDepth) {
    return 0;
  }

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < board.length; i += 1) {
      if (board[i]) continue;
      board[i] = botSymbol;
      const score = minimax(
        board,
        depth + 1,
        false,
        botSymbol,
        humanSymbol,
        maxDepth,
      );
      board[i] = null;
      bestScore = Math.max(bestScore, score);
    }
    return bestScore;
  }

  let bestScore = Infinity;
  for (let i = 0; i < board.length; i += 1) {
    if (board[i]) continue;
    board[i] = humanSymbol;
    const score = minimax(
      board,
      depth + 1,
      true,
      botSymbol,
      humanSymbol,
      maxDepth,
    );
    board[i] = null;
    bestScore = Math.min(bestScore, score);
  }
  return bestScore;
};

const getRandomMove = (board) => {
  const available = [];
  for (let i = 0; i < board.length; i += 1) {
    if (!board[i]) {
      available.push(i);
    }
  }

  if (available.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
};

const getStrategicMove = (board, botSymbol, humanSymbol, maxDepth = null) => {
  let bestScore = -Infinity;
  let move = null;
  for (let i = 0; i < board.length; i += 1) {
    if (board[i]) continue;
    board[i] = botSymbol;
    const score = minimax(
      board,
      0,
      false,
      botSymbol,
      humanSymbol,
      maxDepth,
    );
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      move = i;
    }
  }
  return move;
};

const pickMoveByDifficulty = (board, botSymbol, humanSymbol, difficulty) => {
  switch (difficulty) {
    case "easy":
      return getRandomMove(board);
    case "medium": {
      if (Math.random() < 0.35) {
        return getRandomMove(board);
      }
      return getStrategicMove(board, botSymbol, humanSymbol, 3);
    }
    case "hard":
    default:
      return getStrategicMove(board, botSymbol, humanSymbol);
  }
};

export function BotGame({ onGoHome }) {
  const [board, setBoard] = useState(createEmptyBoard);
  const [turn, setTurn] = useState(TURNS.X);
  const [winner, setWinner] = useState(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [playerSymbol, setPlayerSymbol] = useState(TURNS.X);
  const [playerStarts, setPlayerStarts] = useState(true);
  const [difficulty, setDifficulty] = useState("hard");

  const botSymbol = useMemo(() => getNextTurn(playerSymbol), [playerSymbol]);
  const playerIcon = TURN_ICONS[playerSymbol];
  const botIcon = TURN_ICONS[botSymbol];

  const resetGame = useCallback(() => {
    const nextBoard = createEmptyBoard();
    setBoard(nextBoard);
    setWinner(null);
    setIsBotThinking(false);
    const initialTurn = playerStarts ? playerSymbol : botSymbol;
    setTurn(initialTurn);
  }, [playerStarts, playerSymbol, botSymbol]);

  useEffect(() => {
    resetGame();
  }, [resetGame, difficulty]);

  const commitMove = useCallback(
    (boardAfterMove, currentSymbol) => {
      const moveWinner = checkWinner(boardAfterMove);
      const draw = !moveWinner && checkEndGame(boardAfterMove);

      if (moveWinner) {
        if (moveWinner === playerSymbol) {
          confetti();
        }
        setWinner(moveWinner);
      } else if (draw) {
        setWinner("draw");
      } else {
        setWinner(null);
      }

      setBoard(boardAfterMove);
      setTurn(moveWinner || draw ? null : getNextTurn(currentSymbol));
    },
    [playerSymbol],
  );

  const isPlayerTurn = useMemo(
    () => turn === playerSymbol && winner === null,
    [turn, playerSymbol, winner],
  );

  const handlePlayerMove = (index) => {
    if (!isPlayerTurn || board[index]) return;
    const newBoard = [...board];
    newBoard[index] = playerSymbol;
    commitMove(newBoard, playerSymbol);
  };

  useEffect(() => {
    if (winner || turn !== botSymbol) return;

    setIsBotThinking(true);
    const timeout = setTimeout(() => {
      const boardCopy = [...board];
      const bestMove = pickMoveByDifficulty(
        boardCopy,
        botSymbol,
        playerSymbol,
        difficulty,
      );
      if (bestMove !== null && boardCopy[bestMove] === null) {
        boardCopy[bestMove] = botSymbol;
        commitMove(boardCopy, botSymbol);
      }
      setIsBotThinking(false);
    }, BOT_DELAY);

    return () => {
      clearTimeout(timeout);
      setIsBotThinking(false);
    };
  }, [board, botSymbol, difficulty, playerSymbol, turn, winner, commitMove]);

  const statusText = useMemo(() => {
    if (winner === null) {
      if (isPlayerTurn) {
        return `Tu turno (${playerIcon})`;
      }
      return isBotThinking
        ? "El bot está pensando..."
        : `Turno del bot (${botIcon})`;
    }

    if (winner === "draw") {
      return "¡Empate!";
    }

    return winner === playerSymbol ? "¡Ganaste!" : "El bot ganó";
  }, [winner, isPlayerTurn, isBotThinking, botIcon, playerIcon, playerSymbol]);

  return (
    <section className="board">
      <header className="board-header">
        <button type="button" onClick={onGoHome} className="secondary-button">
          Volver al inicio
        </button>
        <h2>Modo Solo</h2>
      </header>

      <div className="status-message">{statusText}</div>

      <div className="bot-settings">
        <div className="bot-setting-group">
          <span>Elegí tu símbolo</span>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-button ${playerSymbol === TURNS.X ? "is-active" : ""}`}
              onClick={() => setPlayerSymbol(TURNS.X)}
              aria-pressed={playerSymbol === TURNS.X}
            >
              {TURN_ICONS[TURNS.X]} (X)
            </button>
            <button
              type="button"
              className={`toggle-button ${playerSymbol === TURNS.O ? "is-active" : ""}`}
              onClick={() => setPlayerSymbol(TURNS.O)}
              aria-pressed={playerSymbol === TURNS.O}
            >
              {TURN_ICONS[TURNS.O]} (O)
            </button>
          </div>
        </div>

        <div className="bot-setting-group">
          <span>¿Quién empieza?</span>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-button ${playerStarts ? "is-active" : ""}`}
              onClick={() => setPlayerStarts(true)}
              aria-pressed={playerStarts}
            >
              Yo
            </button>
            <button
              type="button"
              className={`toggle-button ${!playerStarts ? "is-active" : ""}`}
              onClick={() => setPlayerStarts(false)}
              aria-pressed={!playerStarts}
            >
              Bot
            </button>
          </div>
        </div>

        <div className="bot-setting-group">
          <span>Dificultad del bot</span>
          <div className="toggle-group">
            {DIFFICULTIES.map((level) => (
              <button
                key={level.id}
                type="button"
                className={`toggle-button ${difficulty === level.id ? "is-active" : ""}`}
                onClick={() => setDifficulty(level.id)}
                aria-pressed={difficulty === level.id}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <p className="bot-settings-note">Cambiar estas opciones reinicia la partida.</p>
      </div>

      <button onClick={resetGame} type="button">
        Reiniciar partida
      </button>

      <section className="game">
        {board.map((square, index) => (
          <Square
            key={index}
            index={index}
            updateBoard={handlePlayerMove}
            disabled={!isPlayerTurn}
          >
            {getIconForValue(square)}
          </Square>
        ))}
      </section>

      <section className="turn">
        <Square isSelected={turn === playerSymbol} disabled>
          {playerIcon}
        </Square>
        <Square isSelected={turn === botSymbol} disabled>
          {botIcon}
        </Square>
      </section>

      {winner !== null && (
        <section className="winner">
          <div className="text">
            <h2>
              {winner === "draw"
                ? "¡Empate!"
                : winner === playerSymbol
                  ? "¡Felicitaciones!"
                  : "El bot ganó"}
            </h2>

            <header className="win">
              {winner !== "draw" && <Square disabled>{getIconForValue(winner)}</Square>}
            </header>

            <footer>
              <button onClick={resetGame} type="button">
                Jugar de nuevo
              </button>
            </footer>
          </div>
        </section>
      )}
    </section>
  );
}

BotGame.propTypes = {
  onGoHome: PropTypes.func.isRequired,
};
