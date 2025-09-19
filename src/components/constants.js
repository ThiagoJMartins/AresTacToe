export const TURNS = {
  X: "X",
  O: "O",
};

export const TURN_ICONS = {
  [TURNS.X]: "❌",
  [TURNS.O]: "⚪",
};

export const winnerCombos = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const createEmptyBoard = () => Array(9).fill(null);

export const checkWinner = (boardToCheck) => {
  for (const combo of winnerCombos) {
    const [a, b, c] = combo;
    if (
      boardToCheck[a] &&
      boardToCheck[a] === boardToCheck[b] &&
      boardToCheck[a] === boardToCheck[c]
    ) {
      return boardToCheck[a];
    }
  }
  return null;
};

export const checkEndGame = (boardToCheck) =>
  boardToCheck.every((square) => square !== null);

export const getNextTurn = (turn) => (turn === TURNS.X ? TURNS.O : TURNS.X);

export const getIconForValue = (value) =>
  value && TURN_ICONS[value] ? TURN_ICONS[value] : value;
