import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
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
const HUMAN = TURNS.X;
const BOT = TURNS.O;

const minimax = (board, depth, isMaximizing, botSymbol, humanSymbol) => {
  const winner = checkWinner(board);
  if (winner === botSymbol) return 10 - depth;
  if (winner === humanSymbol) return depth - 10;
  if (checkEndGame(board)) return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < board.length; i += 1) {
      if (board[i]) continue;
      board[i] = botSymbol;
      const score = minimax(board, depth + 1, false, botSymbol, humanSymbol);
      board[i] = null;
      bestScore = Math.max(bestScore, score);
    }
    return bestScore;
  }

  let bestScore = Infinity;
  for (let i = 0; i < board.length; i += 1) {
    if (board[i]) continue;
    board[i] = humanSymbol;
    const score = minimax(board, depth + 1, true, botSymbol, humanSymbol);
    board[i] = null;
    bestScore = Math.min(bestScore, score);
  }
  return bestScore;
};

const getBestMove = (board, botSymbol, humanSymbol) => {
  let bestScore = -Infinity;
  let move = null;
  for (let i = 0; i < board.length; i += 1) {
    if (board[i]) continue;
    board[i] = botSymbol;
    const score = minimax(board, 0, false, botSymbol, humanSymbol);
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      move = i;
    }
  }
  return move;
};

export function BotGame({ onGoHome }) {
  const [board, setBoard] = useState(createEmptyBoard);
  const [turn, setTurn] = useState(TURNS.X);
  const [winner, setWinner] = useState(null);
  const [isBotThinking, setIsBotThinking] = useState(false);

  const isPlayerTurn = useMemo(
    () => turn === HUMAN && winner === null,
    [turn, winner],
  );

  const commitMove = (boardAfterMove, currentSymbol) => {
    const moveWinner = checkWinner(boardAfterMove);
    const draw = !moveWinner && checkEndGame(boardAfterMove);
    const nextTurn = getNextTurn(currentSymbol);

    if (moveWinner) {
      confetti();
      setWinner(moveWinner);
    } else if (draw) {
      setWinner("draw");
    }

    setBoard(boardAfterMove);
    setTurn(nextTurn);
  };

  const handlePlayerMove = (index) => {
    if (!isPlayerTurn || board[index]) return;
    const newBoard = [...board];
    newBoard[index] = HUMAN;
    commitMove(newBoard, HUMAN);
  };

  useEffect(() => {
    if (winner || turn !== BOT) return;

    setIsBotThinking(true);
    const timeout = setTimeout(() => {
      const boardCopy = [...board];
      const bestMove = getBestMove(boardCopy, BOT, HUMAN);
      if (bestMove !== null && boardCopy[bestMove] === null) {
        boardCopy[bestMove] = BOT;
        commitMove(boardCopy, BOT);
      }
      setIsBotThinking(false);
    }, BOT_DELAY);

    return () => {
      clearTimeout(timeout);
      setIsBotThinking(false);
    };
  }, [board, winner, turn]);

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setTurn(TURNS.X);
    setWinner(null);
    setIsBotThinking(false);
  };

  return (
    <section className="board">
      <header className="board-header">
        <button type="button" onClick={onGoHome} className="secondary-button">
          Volver al inicio
        </button>
        <h2>Modo Solo</h2>
      </header>

      <div className="status-message">
        {winner === null
          ? isPlayerTurn
            ? "Es tu turno"
            : isBotThinking
              ? "El bot está pensando..."
              : "Esperando al bot"
          : winner === "draw"
            ? "¡Empate!"
            : winner === HUMAN
              ? "¡Ganaste!"
              : "El bot ganó"}
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
        <Square isSelected={turn === HUMAN} disabled>
          {TURN_ICONS[HUMAN]}
        </Square>
        <Square isSelected={turn === BOT} disabled>
          {TURN_ICONS[BOT]}
        </Square>
      </section>

      {winner !== null && (
        <section className="winner">
          <div className="text">
            <h2>
              {winner === "draw"
                ? "¡Empate!"
                : winner === HUMAN
                  ? "¡Felicitaciones!"
                  : "El bot ganó"}
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

BotGame.propTypes = {
  onGoHome: PropTypes.func.isRequired,
};
