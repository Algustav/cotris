import { COLS } from "./constants.js";
import { SHAPES } from "./shapes.js";

export function createPiece(type) {
  const shape = SHAPES[type].map(row => row.slice());
  return {
    type,
    shape,
    rotation: 0,
    x: Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2),
    y: 0
  };
}

const JLSTZ_KICKS = {
  "0>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "1>0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "1>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "2>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "2>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "3>2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "3>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "0>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]
};

const I_KICKS = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]]
};

export function rotateShape(shape, direction = 1) {
  if (direction < 0) {
    return shape[0].map((_, x) => shape.map(row => row[row.length - 1 - x]));
  }
  return shape[0].map((_, x) => shape.map(row => row[x]).reverse());
}

export function getRotationTransition(piece, direction = 1) {
  const from = piece.rotation || 0;
  const to = (from + (direction < 0 ? 3 : 1)) % 4;
  return { from, to };
}

export function getKickTests(type, from, to) {
  if (type === "O") return [[0, 0]];
  const table = type === "I" ? I_KICKS : JLSTZ_KICKS;
  return table[`${from}>${to}`] || [[0, 0]];
}

export function clonePiece(piece) {
  return {
    type: piece.type,
    shape: piece.shape.map(row => row.slice()),
    rotation: piece.rotation || 0,
    x: piece.x,
    y: piece.y
  };
}
