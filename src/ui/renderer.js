import { BLOCK, COLS, ROWS } from "../game/constants.js";
import { defaultTheme } from "./theme.js";

export class CanvasRenderer {
  constructor({ boardCanvas, nextList, holdCanvas, theme = defaultTheme }) {
    this.boardCanvas = boardCanvas;
    this.boardCtx = boardCanvas.getContext("2d");
    this.nextList = nextList;
    this.nextSlots = [];
    this.holdCanvas = holdCanvas;
    this.holdCtx = holdCanvas.getContext("2d");
    this.theme = theme;
    this.lineClearEffects = null;
    this.impactEffects = null;
  }

  setTheme(theme) {
    this.theme = { ...this.theme, ...theme };
  }

  setLineClearEffects(effects) {
    this.lineClearEffects = effects;
  }

  setImpactEffects(effects) {
    this.impactEffects = effects;
  }

  draw(state) {
    this.drawBoard(state);
    this.drawNextQueue(state);
    this.drawHold(state);
  }

  drawBoard(state) {
    this.drawGrid();
    state.board.forEach((row, y) => {
      row.forEach((type, x) => {
        if (type) this.drawCell(this.boardCtx, x, y, this.settledColor(type));
      });
    });
    if (state.ghost) {
      this.drawPiece(this.boardCtx, state.ghost, BLOCK, this.theme.ghostAlpha);
    }
    if (state.current) {
      this.drawPiece(this.boardCtx, state.current);
    }
    if (state.lockDelay?.active && state.current) {
      this.drawLockDelay(state);
    }
    if (this.impactEffects?.landedPieceFlash) {
      this.drawLandedPieceFlash(this.impactEffects.landedPieceFlash);
    }
    if (this.lineClearEffects) {
      this.lineClearEffects.draw(this.boardCtx, this.theme);
    }
  }

  drawGrid() {
    this.boardCtx.fillStyle = this.theme.boardBackground;
    this.boardCtx.fillRect(0, 0, this.boardCanvas.width, this.boardCanvas.height);
    this.boardCtx.strokeStyle = this.theme.gridColor;
    this.boardCtx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      const lineX = Math.min(x * BLOCK + 0.5, this.boardCanvas.width - 0.5);
      this.boardCtx.beginPath();
      this.boardCtx.moveTo(lineX, 0);
      this.boardCtx.lineTo(lineX, this.boardCanvas.height);
      this.boardCtx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      const lineY = Math.min(y * BLOCK + 0.5, this.boardCanvas.height - 0.5);
      this.boardCtx.beginPath();
      this.boardCtx.moveTo(0, lineY);
      this.boardCtx.lineTo(this.boardCanvas.width, lineY);
      this.boardCtx.stroke();
    }
  }

  drawHold(state) {
    this.holdCtx.fillStyle = this.theme.previewBackground;
    this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
    if (!state.hold) return;
    this.drawPreviewPiece(this.holdCtx, this.holdCanvas, state.hold, 24, state.canHold ? 1 : 0.38);
  }

  drawNextQueue(state) {
    const visiblePieces = state.nextQueue.slice(0, 4);
    this.ensureNextSlots(visiblePieces.length);
    this.nextSlots.forEach((slot, index) => {
      const piece = visiblePieces[index];
      slot.element.classList.toggle("is-current", index === 0);
      slot.element.style.opacity = String(1 - index * 0.2);
      slot.canvas.width = 52;
      slot.canvas.height = 52;
      slot.ctx.fillStyle = this.theme.previewBackground;
      slot.ctx.fillRect(0, 0, slot.canvas.width, slot.canvas.height);
      if (piece) {
        this.drawPreviewPiece(slot.ctx, slot.canvas, piece, 12, 1);
      }
    });
  }

  ensureNextSlots(count) {
    while (this.nextSlots.length < count) {
      const index = this.nextSlots.length;
      const slot = document.createElement("div");
      slot.className = "next-slot";
      const number = document.createElement("span");
      number.className = "next-index";
      number.textContent = String(index + 1);
      const canvas = document.createElement("canvas");
      canvas.width = 52;
      canvas.height = 52;
      slot.append(number, canvas);
      this.nextList.append(slot);
      this.nextSlots.push({
        element: slot,
        canvas,
        ctx: canvas.getContext("2d")
      });
    }

    while (this.nextSlots.length > count) {
      const slot = this.nextSlots.pop();
      slot.element.remove();
    }
  }

  drawPreviewStack(ctx, canvas, pieces) {
    pieces.forEach((piece, index) => {
      const slotHeight = canvas.height / pieces.length;
      this.drawPreviewPiece(ctx, {
        width: canvas.width,
        height: slotHeight,
        offsetY: index * slotHeight
      }, piece, 18, index === 0 ? 1 : 0.74);
    });
  }

  drawPreviewPiece(ctx, canvas, piece, size, alpha = 1) {
    const offsetYBase = canvas.offsetY || 0;
    const width = piece.shape[0].length * size;
    const height = piece.shape.length * size;
    const offsetX = Math.floor((canvas.width - width) / 2);
    const offsetY = Math.floor(offsetYBase + (canvas.height - height) / 2);
    this.drawPiecePixels(ctx, piece, offsetX, offsetY, size, alpha);
  }

  drawPiecePixels(ctx, piece, offsetX, offsetY, size, alpha = 1) {
    piece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) this.drawCellPixels(ctx, offsetX + x * size, offsetY + y * size, this.theme.colors[piece.type], size, alpha);
      });
    });
  }

  drawPiece(ctx, piece, size = BLOCK, alpha = 1) {
    piece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) this.drawCell(ctx, piece.x + x, piece.y + y, this.theme.colors[piece.type], size, alpha);
      });
    });
  }

  drawCell(ctx, x, y, color, size = BLOCK, alpha = 1) {
    this.drawCellPixels(ctx, x * size, y * size, color, size, alpha);
  }

  drawCellPixels(ctx, x, y, color, size = BLOCK, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.fillStyle = "rgba(255,255,255,.24)";
    ctx.fillRect(x + 3, y + 3, size - 6, 4);
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.fillRect(x + 3, y + size - 7, size - 6, 4);
    ctx.restore();
  }

  settledColor(type) {
    return this.mixColors(this.theme.colors[type], this.theme.boardBackground, 0.32);
  }

  mixColors(foreground, background, amount) {
    const fg = this.hexToRgb(foreground);
    const bg = this.hexToRgb(background);
    if (!fg || !bg) return foreground;
    const mixed = {
      r: Math.round(fg.r * (1 - amount) + bg.r * amount),
      g: Math.round(fg.g * (1 - amount) + bg.g * amount),
      b: Math.round(fg.b * (1 - amount) + bg.b * amount)
    };
    return `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`;
  }

  hexToRgb(hex) {
    const normalized = hex.replace("#", "").trim();
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16)
    };
  }

  drawLockDelay(state) {
    const progress = state.lockDelay.progress;
    const remaining = 1 - progress;
    const color = this.theme.lockColor || this.theme.colors.O || "#ffc857";
    this.boardCtx.save();
    this.boardCtx.strokeStyle = color;
    this.boardCtx.lineWidth = 1.5 + remaining * 3.5;
    this.boardCtx.globalAlpha = 0.14 + remaining * 0.78;
    this.boardCtx.shadowColor = color;
    this.boardCtx.shadowBlur = 2 + remaining * 14;
    state.current.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (!cell) return;
        this.boardCtx.strokeRect(
          (state.current.x + x) * BLOCK + 3,
          (state.current.y + y) * BLOCK + 3,
          BLOCK - 6,
          BLOCK - 6
        );
      });
    });
    this.boardCtx.restore();
  }

  drawLandedPieceFlash(flash) {
    if (!flash.piece) return;
    const progress = Math.min(1, flash.elapsed / flash.duration);
    const alpha = Math.sin((1 - progress) * Math.PI / 2);
    const color = this.theme.lockColor || this.theme.colors[flash.piece.type] || "#ffc857";

    this.boardCtx.save();
    this.boardCtx.strokeStyle = color;
    this.boardCtx.lineWidth = 4 - progress * 1.5;
    this.boardCtx.globalAlpha = alpha;
    this.boardCtx.shadowColor = color;
    this.boardCtx.shadowBlur = 16 * alpha;
    flash.piece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (!cell) return;
        this.boardCtx.strokeRect(
          (flash.piece.x + x) * BLOCK + 3,
          (flash.piece.y + y) * BLOCK + 3,
          BLOCK - 6,
          BLOCK - 6
        );
      });
    });
    this.boardCtx.restore();
  }
}
