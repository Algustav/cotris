export class ImpactEffects {
  constructor({ boardWrap }) {
    this.boardWrap = boardWrap;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.landedPieceFlash = null;
  }

  connect(engine) {
    engine.on("land", event => this.land(event));
    engine.on("reset", () => this.clearFlash());
    engine.on("gameOver", () => this.clearFlash());
  }

  land({ impact = "normal", piece } = {}) {
    if (this.reducedMotion) return;
    this.cancelActiveAnimations();
    const distance = impact === "hard" ? 12 : 7;
    const duration = impact === "hard" ? 150 : 130;
    this.boardWrap.animate([
      { transform: "translateY(0)" },
      { transform: `translateY(${distance}px)`, offset: 0.28 },
      { transform: "translateY(0)" }
    ], {
      duration,
      easing: "cubic-bezier(.15, .9, .25, 1)"
    });
    if (impact === "hard") {
      this.landedPieceFlash = {
        piece,
        elapsed: 0,
        duration: 240
      };
    }
  }

  update(delta) {
    if (!this.landedPieceFlash) return;
    this.landedPieceFlash.elapsed += delta;
    if (this.landedPieceFlash.elapsed >= this.landedPieceFlash.duration) {
      this.clearFlash();
    }
  }

  clearFlash() {
    this.landedPieceFlash = null;
  }

  cancelActiveAnimations() {
    this.boardWrap.getAnimations().forEach(animation => animation.cancel());
  }
}
