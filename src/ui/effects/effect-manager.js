import { COLS, ROWS } from "../../game/constants.js";
import { ClearEffects } from "./clear-effects.js";
import { defaultEffectPreset } from "./effect-presets.js";
import { DangerEffects } from "./danger-effects.js";
import { ImpactEffects } from "./impact-effects.js";
import { MotionEffects } from "./motion-effects.js";
import { PieceEffects } from "./piece-effects.js";
import { ProgressEffects } from "./progress-effects.js";
import { SessionEffects } from "./session-effects.js";
import { ThemeEffects } from "./theme-effects.js";

export class EffectManager {
  constructor({
    boardWrap,
    holdCanvas,
    levelElement,
    speedElement,
    overlay,
    onHitStop,
    getCurrentTheme,
    preset = defaultEffectPreset
  }) {
    this.preset = preset;
    this.onHitStop = onHitStop;
    this.motion = new MotionEffects({ boardWrap, preset });
    this.impact = new ImpactEffects({ boardWrap, preset });
    this.pendingBoardEffect = null;
    this.boardEffectTimer = null;
    this.clear = new ClearEffects({
      boardWrap,
      preset,
      onTetrisClear: () => this.requestBoardEffect(1, () => this.clear.flashBoard())
    });
    this.piece = new PieceEffects({ holdCanvas, getCurrentTheme, preset });
    this.progress = new ProgressEffects({
      boardWrap,
      levelElement,
      speedElement,
      onLevelUp: () => this.hitStop(),
      onBoardPulse: () => this.requestBoardEffect(2, () => this.progress.pulseBoard())
    });
    this.danger = new DangerEffects({ preset });
    this.theme = new ThemeEffects({ boardWrap, preset });
    this.session = new SessionEffects({ boardWrap, overlay, preset });
  }

  connect(engine) {
    this.motion.connect(engine);
    this.impact.connect(engine);
    this.clear.connect(engine);
    this.piece.connect(engine);
    this.progress.connect(engine);
    this.danger.connect(engine);
    this.session.connect(engine);
  }

  update(delta) {
    this.clear.update(delta);
    this.impact.update(delta);
    this.piece.update(delta);
    this.progress.update(delta);
    this.danger.update(delta);
    this.session.update(delta);
  }

  themeChange(theme, onSwitch) {
    this.hitStop();
    this.requestBoardEffect(3, () => this.theme.change(theme, onSwitch));
  }

  requestBoardEffect(priority, run) {
    if (!this.pendingBoardEffect || priority >= this.pendingBoardEffect.priority) {
      this.pendingBoardEffect = { priority, run };
    }
    if (this.boardEffectTimer) return;
    this.boardEffectTimer = window.setTimeout(() => {
      const effect = this.pendingBoardEffect;
      this.pendingBoardEffect = null;
      this.boardEffectTimer = null;
      effect?.run();
    }, 0);
  }

  test(name, state, theme) {
    const currentState = state || {};
    if (name === "wall") {
      this.motion.wallBump(Math.random() > 0.5 ? 1 : -1);
    } else if (name === "drop") {
      this.impact.land({ impact: "hard", piece: currentState.current });
    } else if (name === "clear") {
      this.testClear(1, theme);
    } else if (name === "tetris") {
      this.testClear(4, theme);
    } else if (name === "hold") {
      this.piece.hold({
        ...currentState,
        hold: currentState.hold || currentState.current || { type: "T" }
      });
    } else if (name === "level") {
      this.progress.levelUp();
    } else if (name === "theme") {
      this.themeChange(theme);
    } else if (name === "start") {
      this.session.start();
    } else if (name === "over") {
      this.session.gameOver();
    }
  }

  testClear(count, theme) {
    const rows = Array.from({ length: count }, (_, index) => ROWS - count + index);
    const types = Object.keys(theme?.colors || {});
    const fallbackTypes = types.length ? types : ["I", "O", "T", "S", "Z", "J", "L"];
    const boardSnapshot = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    rows.forEach((row, rowIndex) => {
      boardSnapshot[row] = Array.from(
        { length: COLS },
        (_, x) => fallbackTypes[(x + rowIndex) % fallbackTypes.length]
      );
    });
    this.clear.start({
      rows,
      rowEffects: rows.map((row, index) => ({
        row,
        start: index * 55,
        duration: 420
      })),
      boardSnapshot
    });
    if (count >= 4) {
      this.requestBoardEffect(1, () => this.clear.flashBoard());
    }
    window.clearTimeout(this.clearTestTimer);
    this.clearTestTimer = window.setTimeout(() => this.clear.stop(), 720);
  }

  hitStop(duration = 200) {
    this.onHitStop?.(duration);
  }
}
