export class PieceEffects {
  constructor({ holdCanvas, getCurrentTheme }) {
    this.holdTarget = holdCanvas;
    this.getCurrentTheme = getCurrentTheme;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  connect(engine) {
    engine.on("hold", state => this.hold(state));
  }

  hold(state) {
    if (this.reducedMotion || !this.holdTarget) return;
    const color = this.getHoldColor(state);
    const baseBorder = getComputedStyle(this.holdTarget).borderColor;
    this.holdTarget.animate([
      {
        borderColor: baseBorder,
        boxShadow: "0 0 0 rgba(0,0,0,0)",
        filter: "brightness(1) blur(0)"
      },
      {
        borderColor: color,
        boxShadow: `0 0 0 1px ${color}, 0 0 8px 2px ${color}`,
        filter: "brightness(1.04) blur(.15px)",
        offset: 0.18
      },
      {
        borderColor: color,
        boxShadow: `0 0 0 2px ${color}, 0 0 18px 5px ${color}`,
        filter: "brightness(1.12) blur(.45px)",
        offset: 0.5
      },
      {
        borderColor: color,
        boxShadow: `0 0 0 1px ${color}, 0 0 8px 2px ${color}`,
        filter: "brightness(1.04) blur(.15px)",
        offset: 0.82
      },
      {
        borderColor: baseBorder,
        boxShadow: "0 0 0 rgba(0,0,0,0)",
        filter: "brightness(1) blur(0)"
      }
    ], {
      duration: 520,
      easing: "cubic-bezier(.32, 0, .18, 1)"
    });
  }

  getHoldColor(state) {
    const type = state?.hold?.type;
    const color = this.getCurrentTheme?.()?.colors?.[type] || "var(--accent)";
    return dimHexColor(color, 0.74);
  }

  update() {}
}

function dimHexColor(color, amount) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  if (!match) return color;
  const [, r, g, b] = match;
  return `rgb(${Math.round(parseInt(r, 16) * amount)}, ${Math.round(parseInt(g, 16) * amount)}, ${Math.round(parseInt(b, 16) * amount)})`;
}
