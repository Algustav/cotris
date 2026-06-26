import { COLS } from "./constants.js";
import { createBoard } from "./board.js";
import { createPiece, rotateShape } from "./piece.js";

export const tspinPresets = {
  tDouble: {
    label: "T Double",
    current: { x: 4, y: 0, rotation: 0 },
    rows: {
      14: "...ZZ....I",
      15: "S...ZZJJJI",
      16: "SS.OOOLJJI",
      17: ".S.OOOL..I",
      18: "..OOOL...I",
      19: "..OOOL...."
    }
  },
  tTriple: {
    label: "T Triple",
    current: { x: 4, y: 0, rotation: 0 },
    rows: {
      13: "..LL......",
      14: "...L.Z....",
      15: "JJ.LZZ....",
      16: "J..LZS....",
      17: "JJ.LZSSOOI",
      18: "JJSOZLSOOI",
      19: "JS.OZLSOOI"
    }
  }
};

export function createTspinDebugState(name) {
  const preset = tspinPresets[name];
  if (!preset) return null;
  const board = createBoard();
  Object.entries(preset.rows).forEach(([rowIndex, row]) => {
    board[Number(rowIndex)] = rowToBoard(row, Number(rowIndex));
  });

  const current = createPiece("T");
  current.x = preset.current.x;
  current.y = preset.current.y;
  for (let i = 0; i < preset.current.rotation; i++) {
    current.shape = rotateShape(current.shape, 1);
    current.rotation = (current.rotation + 1) % 4;
  }

  return {
    board,
    current,
    nextQueue: ["T", "I", "O", "S", "Z"],
    hold: null,
    canHold: false
  };
}

function rowToBoard(row, rowIndex) {
  return Array.from({ length: COLS }, (_, x) => {
    const marker = row[x] || ".";
    if (marker === ".") return "";
    void rowIndex;
    return marker;
  });
}
