import { BLOCK, COLS } from "../../game/constants.js";

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export class ClearEffects {
  constructor({ boardWrap, onTetrisClear } = {}) {
    this.boardWrap = boardWrap;
    this.onTetrisClear = onTetrisClear;
    this.active = false;
    this.elapsed = 0;
    this.rows = [];
    this.rowEffects = [];
    this.boardSnapshot = [];
    this.particles = [];
  }

  connect(engine) {
    engine.on("lineClearStart", event => this.start(event));
    engine.on("lineClearCommit", event => this.commit(event));
    engine.on("reset", () => this.stop());
    engine.on("gameOver", () => this.stop());
  }

  start({ rows, rowEffects, boardSnapshot }) {
    this.active = true;
    this.elapsed = 0;
    this.rows = rows;
    this.rowEffects = rowEffects;
    this.boardSnapshot = boardSnapshot;
    this.particles = this.createParticles(rows, boardSnapshot);
  }

  commit(event) {
    if (event?.cleared >= 4) {
      this.onTetrisClear?.();
    }
    this.stop();
  }

  stop() {
    this.active = false;
    this.elapsed = 0;
    this.rows = [];
    this.rowEffects = [];
    this.boardSnapshot = [];
    this.particles = [];
  }

  update(delta) {
    if (!this.active) return;
    this.elapsed += delta;
    this.particles.forEach(particle => {
      particle.age += delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += particle.gravity * delta;
      particle.spin += particle.spinSpeed * delta;
    });
  }

  draw(ctx, theme) {
    if (!this.active) return;
    const scanColor = theme.lockColor || theme.colors.I || "#79c0ff";
    const background = theme.boardBackground || "#0d1220";
    const intensity = this.rows.length;

    this.rowEffects.forEach(effect => {
      const progress = clamp((this.elapsed - effect.start) / effect.duration);
      if (progress <= 0) return;
      this.drawRowDissolve(ctx, theme, effect.row, progress, scanColor, background, intensity);
    });
    this.drawParticles(ctx, theme);
  }

  drawRowDissolve(ctx, theme, row, progress, scanColor, background, intensity = 1) {
    const scanPosition = progress * COLS;
    const rowY = row * BLOCK;
    const flash = Math.max(0, 1 - progress * 2.7);
    const sweepAlpha = progress < 1 ? 0.68 + intensity * 0.08 : 0;

    ctx.save();
    ctx.globalAlpha = 0.2 + flash * 0.45;
    ctx.fillStyle = scanColor;
    ctx.shadowColor = scanColor;
    ctx.shadowBlur = 8 + intensity * 3;
    ctx.fillRect(0, rowY, COLS * BLOCK, BLOCK);
    ctx.restore();

    for (let x = 0; x < COLS; x++) {
      const type = this.boardSnapshot[row]?.[x];
      const cellProgress = clamp(scanPosition - x);
      if (!type || cellProgress <= 0) continue;
      const shrink = cellProgress * 8;
      const alpha = 0.2 + cellProgress * 0.78;
      const cellColor = theme.colors[type] || scanColor;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = background;
      ctx.fillRect(
        x * BLOCK + 1 + shrink / 2,
        rowY + 1 + shrink / 2,
        BLOCK - 2 - shrink,
        BLOCK - 2 - shrink
      );

      ctx.globalAlpha = 1 - cellProgress;
      ctx.strokeStyle = cellColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = cellColor;
      ctx.shadowBlur = 8;
      ctx.strokeRect(x * BLOCK + 4, rowY + 4, BLOCK - 8, BLOCK - 8);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = scanColor;
    ctx.globalAlpha = sweepAlpha;
    ctx.lineWidth = 3 + intensity * 0.7;
    ctx.shadowColor = scanColor;
    ctx.shadowBlur = 14 + intensity * 4;
    const x = Math.min(COLS * BLOCK - 2, scanPosition * BLOCK);
    ctx.beginPath();
    ctx.moveTo(x, rowY + 2);
    ctx.lineTo(x, rowY + BLOCK - 2);
    ctx.stroke();
    ctx.restore();

    if (intensity >= 4) {
      this.drawTetrisSweep(ctx, rowY, progress, scanColor);
    }
  }

  drawTetrisSweep(ctx, rowY, progress, scanColor) {
    if (progress <= 0 || progress >= 0.9) return;
    const alpha = Math.sin(progress * Math.PI) * 0.46;
    ctx.save();
    const gradient = ctx.createLinearGradient(0, rowY, COLS * BLOCK, rowY);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.5, scanColor);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.shadowColor = scanColor;
    ctx.shadowBlur = 22;
    ctx.fillRect(0, rowY - 2, COLS * BLOCK, BLOCK + 4);
    ctx.restore();
  }

  createParticles(rows, boardSnapshot) {
    const particles = [];
    rows.forEach(row => {
      for (let x = 0; x < COLS; x++) {
        const type = boardSnapshot[row]?.[x];
        if (!type) continue;
        const count = rows.length >= 3 ? 4 : 3;
        for (let i = 0; i < count; i++) {
          const direction = i % 2 === 0 ? -1 : 1;
          particles.push({
            type,
            x: x * BLOCK + BLOCK / 2 + (Math.random() - 0.5) * 12,
            y: row * BLOCK + BLOCK / 2 + (Math.random() - 0.5) * 8,
            vx: direction * (0.045 + Math.random() * 0.09),
            vy: -0.08 - Math.random() * 0.14,
            gravity: 0.00032 + Math.random() * 0.00018,
            size: 3 + Math.random() * 4,
            age: 0,
            life: 260 + Math.random() * 210,
            spin: Math.random() * Math.PI,
            spinSpeed: (Math.random() - 0.5) * 0.014
          });
        }
      }
    });
    return particles;
  }

  drawParticles(ctx, theme) {
    this.particles.forEach(particle => {
      const progress = clamp(particle.age / particle.life);
      if (progress >= 1) return;
      const alpha = Math.sin((1 - progress) * Math.PI / 2);
      const color = theme.colors[particle.type] || theme.lockColor || "#79c0ff";

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.spin);
      ctx.globalAlpha = alpha * 0.82;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      const size = particle.size * (1 - progress * 0.45);
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    });
  }

  flashBoard() {
    if (!this.boardWrap) return;
    this.boardWrap.animate([
      {
        borderColor: "var(--line)",
        boxShadow: "0 22px 70px var(--shadow), inset 0 0 0 1px rgba(255,255,255,.06)"
      },
      {
        borderColor: "var(--accent)",
        boxShadow: "0 22px 70px var(--shadow), 0 0 0 1px var(--accent), 0 0 10px var(--accent)",
        offset: 0.18
      },
      {
        borderColor: "var(--accent)",
        boxShadow: "0 22px 70px var(--shadow), 0 0 0 3px var(--accent), 0 0 28px var(--accent)",
        offset: 0.5
      },
      {
        borderColor: "var(--accent)",
        boxShadow: "0 22px 70px var(--shadow), 0 0 0 1px var(--accent), 0 0 10px var(--accent)",
        offset: 0.82
      },
      {
        borderColor: "var(--line)",
        boxShadow: "0 22px 70px var(--shadow), inset 0 0 0 1px rgba(255,255,255,.06)"
      }
    ], {
      duration: 520,
      easing: "cubic-bezier(.32, 0, .18, 1)"
    });
  }
}
