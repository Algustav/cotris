import { COLS, ROWS } from "./constants.js";

export function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(""));
}

export function collide(board, piece, offsetX = 0, offsetY = 0, shape = piece.shape) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const nextX = piece.x + x + offsetX;
      const nextY = piece.y + y + offsetY;
      if (nextX < 0 || nextX >= COLS || nextY >= ROWS) return true;
      if (nextY >= 0 && board[nextY][nextX]) return true;
    }
  }
  return false;
}

export function mergePiece(board, piece) {
  piece.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return;
      const boardY = piece.y + y;
      if (boardY >= 0) board[boardY][piece.x + x] = piece.type;
    });
  });
}

export function clearCompletedLines(board) {
  return clearRows(board, findCompletedRows(board));
}

export function findCompletedRows(board) {
  const rows = [];
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(Boolean)) rows.push(y);
  }
  return rows;
}

export function clearRows(board, rows) {
  const targets = new Set(rows);
  const remaining = board.filter((_, y) => !targets.has(y));
  const added = Array.from({ length: ROWS - remaining.length }, () => Array(COLS).fill(""));
  board.splice(0, ROWS, ...added, ...remaining);
  return rows.length;
}

export function cloneBoard(board) {
  return board.map(row => row.slice());
}
