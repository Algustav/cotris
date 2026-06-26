import { INITIAL_DROP_INTERVAL } from "../game/constants.js";

export class Hud {
  constructor(elements) {
    this.elements = elements;
  }

  update(state) {
    this.elements.score.textContent = state.score;
    this.elements.lines.textContent = state.lines;
    this.elements.level.textContent = state.level;
    this.elements.speed.textContent = state.mode?.autoGravity === false
      ? "Manual"
      : `${(INITIAL_DROP_INTERVAL / state.dropInterval).toFixed(1)}x`;
    this.elements.pauseButton.textContent = state.paused ? "继续" : "暂停";
    this.elements.ghostToggle.checked = state.showGhost;
  }
}
