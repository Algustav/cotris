const THEME_TRANSITION_DURATION = 520;
const THEME_SWITCH_OFFSET = 0.45;

export class ThemeEffects {
  constructor({ boardWrap }) {
    this.boardWrap = boardWrap;
    this.activeMask = null;
    this.activePageFade = null;
    this.switchTimer = null;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  change(theme, onSwitch) {
    if (!this.boardWrap) {
      onSwitch?.();
      return;
    }

    window.clearTimeout(this.switchTimer);
    this.activeMask?.remove();
    this.activePageFade?.remove();
    this.activeMask = null;
    this.activePageFade = null;

    let switched = false;
    const switchTheme = () => {
      if (switched) return;
      switched = true;
      const oldBackground = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
      onSwitch?.();
      this.fadePageBackground(oldBackground);
    };

    if (this.reducedMotion) {
      onSwitch?.();
      return;
    }

    const accent = theme?.css?.["--accent"] || theme?.colors?.I || "#79c0ff";
    const mask = document.createElement("div");
    mask.className = "theme-transition-mask";
    mask.style.cssText = `
      position: absolute;
      inset: -8px;
      z-index: 3;
      pointer-events: none;
      border-radius: 12px;
      background: ${accent};
      opacity: 0;
      filter: blur(10px);
      mix-blend-mode: screen;
    `;
    this.boardWrap.append(mask);
    this.activeMask = mask;

    this.switchTimer = window.setTimeout(
      switchTheme,
      Math.round(THEME_TRANSITION_DURATION * THEME_SWITCH_OFFSET)
    );

    mask.animate([
      { opacity: 0, filter: "blur(18px) saturate(1.05)" },
      { opacity: 0.22, filter: "blur(12px) saturate(1.15)", offset: 0.18 },
      { opacity: 0.5, filter: "blur(7px) saturate(1.25)", offset: THEME_SWITCH_OFFSET },
      { opacity: 0.22, filter: "blur(12px) saturate(1.12)", offset: 0.78 },
      { opacity: 0, filter: "blur(18px) saturate(1)" }
    ], {
      duration: THEME_TRANSITION_DURATION,
      easing: "cubic-bezier(.32, 0, .18, 1)"
    }).addEventListener("finish", () => {
      if (this.activeMask !== mask) return;
      window.clearTimeout(this.switchTimer);
      switchTheme();
      mask.remove();
      this.activeMask = null;
    }, { once: true });

    this.boardWrap.animate([
      { filter: "brightness(1)" },
      { filter: "brightness(1.08)", offset: THEME_SWITCH_OFFSET },
      { filter: "brightness(1)" }
    ], {
      duration: THEME_TRANSITION_DURATION,
      easing: "cubic-bezier(.32, 0, .18, 1)"
    });
  }

  fadePageBackground(oldBackground) {
    if (!oldBackground) return;

    const fade = document.createElement("div");
    fade.className = "theme-page-fade";
    fade.style.background = oldBackground;
    document.body.prepend(fade);
    this.activePageFade = fade;

    fade.animate([
      { opacity: 1 },
      { opacity: 0 }
    ], {
      duration: Math.round(THEME_TRANSITION_DURATION * (1 - THEME_SWITCH_OFFSET)),
      easing: "cubic-bezier(.32, 0, .18, 1)"
    }).addEventListener("finish", () => {
      if (this.activePageFade !== fade) return;
      fade.remove();
      this.activePageFade = null;
    }, { once: true });
  }
}
