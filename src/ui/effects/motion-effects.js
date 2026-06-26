export class MotionEffects {
  constructor({ boardWrap }) {
    this.boardWrap = boardWrap;
    this.lastBumpAt = 0;
    this.bumpCooldown = 80;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  connect(engine) {
    engine.on("moveBlocked", event => this.wallBump(event.direction));
  }

  wallBump(direction) {
    if (this.reducedMotion || !this.canBump()) return;
    this.lastBumpAt = performance.now();
    this.cancelActiveAnimations();
    const distance = direction < 0 ? -6 : 6;
    this.boardWrap.animate([
      { transform: "translateX(0)" },
      { transform: `translateX(${distance}px)`, offset: 0.34 },
      { transform: "translateX(0)" }
    ], {
      duration: 110,
      easing: "cubic-bezier(.2, 1.4, .3, 1)"
    });
  }

  canBump() {
    return performance.now() - this.lastBumpAt >= this.bumpCooldown;
  }

  cancelActiveAnimations() {
    this.boardWrap.getAnimations().forEach(animation => animation.cancel());
  }
}

