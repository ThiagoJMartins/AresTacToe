import PropTypes from "prop-types";
import { useMemo, useState } from "react";
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

const BOARD_STORAGE_KEY = "offline-board";
const TURN_STORAGE_KEY = "offline-turn";

const normalizeStoredValue = (value) => {
  if (value === TURN_ICONS[TURNS.X]) return TURNS.X;
  if (value === TURN_ICONS[TURNS.O]) return TURNS.O;
  if (value === TURNS.X || value === TURNS.O) return value;
  return null;
};

const readStoredBoard = () => {
  if (typeof window === "undefined") return createEmptyBoard();
  const raw = window.localStorage.getItem(BOARD_STORAGE_KEY);
  if (!raw) return createEmptyBoard();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 9) {
      return parsed.map((cell) => normalizeStoredValue(cell));
    }
  } catch (error) {
    console.error("Error parsing stored board", error);
  }
  return createEmptyBoard();
};

const readStoredTurn = () => {
  if (typeof window === "undefined") return TURNS.X;
  const raw = window.localStorage.getItem(TURN_STORAGE_KEY);
  return normalizeStoredValue(raw) ?? TURNS.X;
};

const persistState = (board, turn) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(board));
  window.localStorage.setItem(TURN_STORAGE_KEY, turn);
};

export function OfflineGame({ onGoHome }) {
  const [board, setBoard] = useState(readStoredBoard);
  const [turn, setTurn] = useState(readStoredTurn);
  const [winner, setWinner] = useState(null);

  const isBoardDisabled = useMemo(() => winner !== null, [winner]);

  const resetGame = () => {
    const nextTurn =
      winner && winner !== "draw"
        ? winner === TURNS.X
          ? TURNS.O
          : TURNS.X
        : TURNS.X;

    const freshBoard = createEmptyBoard();
    setBoard(freshBoard);
    setTurn(nextTurn);
    setWinner(null);
    persistState(freshBoard, nextTurn);
  };

  const updateBoard = (index) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = turn;
    setBoard(newBoard);

    const newWinner = checkWinner(newBoard);
    const isDraw = !newWinner && checkEndGame(newBoard);
    const nextTurn = getNextTurn(turn);

    if (newWinner) {
      confetti();
      setWinner(newWinner);
    } else if (isDraw) {
      setWinner("draw");
    }

    setTurn(nextTurn);
    persistState(newBoard, nextTurn);
  };

  return (
    <section className="board">
      <header className="board-header">
        <button type="button" onClick={onGoHome} className="secondary-button">
          Volver al inicio
        </button>
        <h2>Juego local</h2>
      </header>

      <button onClick={resetGame} type="button">
        Reiniciar partida
      </button>

      <section className="game">
        {board.map((square, index) => (
          <Square
            key={index}
            index={index}
            updateBoard={updateBoard}
            disabled={isBoardDisabled}
          >
            {getIconForValue(square)}
          </Square>
        ))}
      </section>

      <section className="turn">
        <Square isSelected={turn === TURNS.X} disabled>
          {TURN_ICONS[TURNS.X]}
        </Square>
        <Square isSelected={turn === TURNS.O} disabled>
          {TURN_ICONS[TURNS.O]}
        </Square>
      </section>

      {winner !== null && (
        <section className="winner">
          <div className="text">
            <h2>
              {winner === "draw" ? "¡Empate!" : "Ganador:"}
            </h2>

            <header className="win">
              {winner !== "draw" && (
                <Square disabled>{getIconForValue(winner)}</Square>
              )}
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

OfflineGame.propTypes = {
  onGoHome: PropTypes.func.isRequired,
};
