import {
  INITIAL_DROP_INTERVAL,
  LINES_PER_LEVEL,
  SCORE_TABLE
} from "./constants.js";

const MARATHON_MAX_SPEED = 9;
const MARATHON_SPEED_STEP = 0.25;

function standardLevel(lines) {
  return Math.floor(lines / LINES_PER_LEVEL) + 1;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function marathonDropInterval(level) {
  const speed = clamp(1 + (level - 1) * MARATHON_SPEED_STEP, 1, MARATHON_MAX_SPEED);
  return INITIAL_DROP_INTERVAL / speed;
}

function lineScore(cleared, level) {
  return SCORE_TABLE[cleared] * level;
}

function tSpinScore(cleared, level) {
  const scores = [400, 800, 1200, 1600];
  return (scores[cleared] || 0) * level;
}

export const gameModes = {
  marathon: {
    id: "marathon",
    name: "马拉松",
    description: "标准挑战，按消除行数逐步提速。",
    autoGravity: true,
    topOut: "gameOver",
    getLevel: standardLevel,
    getDropInterval: ({ level }) => marathonDropInterval(level),
    scoreLines: lineScore,
    scoreTSpin: tSpinScore,
    scoreSoftDrop: () => 1,
    scoreHardDrop: distance => distance * 2
  },
  zen: {
    id: "zen",
    name: "禅境",
    description: "固定 1 倍速，堆到顶端后清屏继续。",
    autoGravity: true,
    topOut: "clearBoard",
    getLevel: () => 1,
    getDropInterval: () => INITIAL_DROP_INTERVAL,
    scoreLines: lineScore,
    scoreTSpin: tSpinScore,
    scoreSoftDrop: () => 1,
    scoreHardDrop: distance => distance * 2
  },
  practice: {
    id: "practice",
    name: "练习",
    description: "不自动下坠，用于练习摆放和旋转。",
    autoGravity: false,
    topOut: "clearBoard",
    getLevel: () => 1,
    getDropInterval: () => Infinity,
    scoreLines: () => 0,
    scoreTSpin: () => 0,
    scoreSoftDrop: () => 0,
    scoreHardDrop: () => 0
  }
};

export const defaultModeId = "marathon";

export function getMode(id) {
  return gameModes[id] || gameModes[defaultModeId];
}

export function listModes() {
  return Object.values(gameModes);
}
