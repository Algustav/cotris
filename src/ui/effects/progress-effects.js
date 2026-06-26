export class ProgressEffects {
  constructor({ boardWrap, levelElement, speedElement, onLevelUp, onBoardPulse }) {
    this.boardWrap = boardWrap;
    this.levelElement = levelElement;
    this.speedElement = speedElement;
    this.onLevelUp = onLevelUp;
    this.onBoardPulse = onBoardPulse;
    this.lastLevel = null;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  connect(engine) {
    engine.on("start", state => this.syncLevel(state));
    engine.on("reset", state => this.syncLevel(state));
    engine.on("modeChange", state => this.syncLevel(state));
    engine.on("topOutRecover", state => this.syncLevel(state));
    engine.on("lineClearCommit", event => this.checkLevelUp(event.state));
  }

  syncLevel(state) {
    this.lastLevel = state.level;
  }

  checkLevelUp(state) {
    if (this.lastLevel !== null && state.level > this.lastLevel) {
      this.levelUp();
    }
    this.lastLevel = state.level;
  }

  levelUp() {
    this.onLevelUp?.();
    if (this.reducedMotion) return;
    [this.levelElement, this.speedElement].forEach(element => this.pulseElement(element));
    if (this.onBoardPulse) {
      this.onBoardPulse();
    } else {
      this.pulseBoard();
    }
  }

  pulseElement(element) {
    if (!element) return;
    element.animate([
      { transform: "scale(1)", filter: "brightness(1)" },
      { transform: "scale(1.04)", filter: "brightness(1.12)", offset: 0.18 },
      { transform: "scale(1.12)", filter: "brightness(1.35)", offset: 0.5 },
      { transform: "scale(1.04)", filter: "brightness(1.12)", offset: 0.82 },
      { transform: "scale(1)", filter: "brightness(1)" }
    ], {
      duration: 520,
      easing: "cubic-bezier(.32, 0, .18, 1)"
    });
  }

  pulseBoard() {
    if (!this.boardWrap) return;
    this.boardWrap.animate([
      { borderColor: "var(--line)" },
      { borderColor: "var(--gold)", offset: 0.18 },
      { borderColor: "var(--gold)", offset: 0.5 },
      { borderColor: "var(--gold)", offset: 0.82 },
      { borderColor: "var(--line)" }
    ], {
      duration: 520,
      easing: "cubic-bezier(.32, 0, .18, 1)"
    });
  }

  update() {}
}
