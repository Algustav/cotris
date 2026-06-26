import {
  INITIAL_DROP_INTERVAL,
  LEVEL_SPEED_STEP,
  LINES_PER_LEVEL,
  MIN_DROP_INTERVAL,
  SCORE_TABLE
} from "./constants.js";

export function levelForLines(lines) {
  return Math.floor(lines / LINES_PER_LEVEL) + 1;
}

export function dropIntervalForLevel(level) {
  return Math.max(MIN_DROP_INTERVAL, INITIAL_DROP_INTERVAL - (level - 1) * LEVEL_SPEED_STEP);
}

export function scoreLines(cleared, level) {
  return SCORE_TABLE[cleared] * level;
}

export function scoreSoftDrop() {
  return 1;
}

export function scoreHardDrop(distance) {
  return distance * 2;
}
