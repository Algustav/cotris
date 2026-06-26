export class SessionEffects {
  constructor({ boardWrap, overlay }) {
    this.boardWrap = boardWrap;
    this.overlay = overlay;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  connect(engine) {
    engine.on("start", () => this.start());
    engine.on("gameOver", () => this.gameOver());
  }

  start() {
    if (this.reducedMotion) return;
    this.boardWrap?.animate([
      { transform: "scale(1.2)", filter: "blur(8px) brightness(.86)", opacity: 0.72 },
      { transform: "scale(1.035)", filter: "blur(1.5px) brightness(1.08)", opacity: 1, offset: 0.62 },
      { transform: "scale(1)", filter: "blur(0) brightness(1)", opacity: 1 }
    ], {
      duration: 1200,
      easing: "cubic-bezier(.18, .9, .22, 1)"
    });
  }

  gameOver() {
    if (this.reducedMotion) return;
    this.boardWrap?.animate([
      { filter: "brightness(1) saturate(1)" },
      { filter: "brightness(.58) saturate(.75)", offset: 0.42 },
      { filter: "brightness(.86) saturate(.9)" }
    ], {
      duration: 360,
      easing: "ease-out"
    });

    this.overlay?.animate([
      { opacity: 0, backdropFilter: "blur(0px)" },
      { opacity: 1, backdropFilter: "blur(3px)" }
    ], {
      duration: 220,
      easing: "ease-out"
    });
  }

  update() {}
}
