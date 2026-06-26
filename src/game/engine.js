import { INITIAL_DROP_INTERVAL, LINE_CLEAR_DURATION, LINE_CLEAR_STAGGER, LOCK_DELAY, NEXT_PREVIEW_COUNT } from "./constants.js";
import { clearRows, cloneBoard, collide, createBoard, findCompletedRows, mergePiece } from "./board.js";
import { SevenBag } from "./bag.js";
import { clonePiece, createPiece, getKickTests, getRotationTransition, rotateShape } from "./piece.js";
import { GameEvents } from "./events.js";
import { defaultModeId, getMode } from "./modes.js";

export class GameEngine {
  constructor(modeId = defaultModeId) {
    this.events = new GameEvents();
    this.showGhost = true;
    this.mode = getMode(modeId);
    this.reset();
  }

  on(type, handler) {
    return this.events.on(type, handler);
  }

  reset() {
    this.bag = new SevenBag();
    this.board = createBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropCounter = 0;
    this.lockCounter = 0;
    this.clearCounter = 0;
    this.pendingClear = null;
    this.lastAction = null;
    this.lastTSpin = null;
    this.dropInterval = this.mode.getDropInterval({ level: this.level, lines: this.lines });
    this.current = this.createNextPiece();
    this.nextQueue = this.createNextQueue();
    this.hold = null;
    this.canHold = true;
    this.status = "idle";
    this.events.emit("reset", this.getState());
  }

  start() {
    if (this.status === "gameOver") {
      this.reset();
    }
    this.status = "playing";
    this.events.emit("start", this.getState());
  }

  togglePause() {
    if (this.status !== "playing" && this.status !== "paused") return;
    this.status = this.status === "paused" ? "playing" : "paused";
    this.events.emit(this.status === "paused" ? "pause" : "resume", this.getState());
  }

  restart() {
    this.reset();
    this.start();
  }

  setMode(modeId) {
    const nextMode = getMode(modeId);
    if (nextMode.id === this.mode.id) return;
    this.mode = nextMode;
    this.level = this.mode.getLevel(this.lines);
    this.dropInterval = this.mode.getDropInterval({ level: this.level, lines: this.lines });
    this.events.emit("modeChange", this.getState());
  }

  tick(delta) {
    if (this.status === "clearing") {
      this.updateLineClear(delta);
      return;
    }
    if (this.status !== "playing") return;
    if (this.updateLockDelay(delta)) return;
    if (!this.mode.autoGravity) return;
    this.dropCounter += delta;
    if (this.dropCounter > this.dropInterval) {
      this.gravityStep();
    }
  }

  moveLeft() {
    this.movePiece(-1);
  }

  moveRight() {
    this.movePiece(1);
  }

  movePiece(dir) {
    if (!this.canControl()) return;
    if (!collide(this.board, this.current, dir, 0)) {
      this.current.x += dir;
      this.lastAction = { type: "move" };
      this.events.emit("move", { direction: dir, state: this.getState() });
    } else {
      this.events.emit("moveBlocked", {
        direction: dir,
        reason: "wall-or-stack",
        state: this.getState()
      });
    }
  }

  rotate(direction = 1) {
    if (!this.canControl()) return;
    const { from, to } = getRotationTransition(this.current, direction);
    const rotated = rotateShape(this.current.shape, direction);
    const kicks = getKickTests(this.current.type, from, to);
    for (let index = 0; index < kicks.length; index++) {
      const [kickX, kickY] = kicks[index];
      if (!collide(this.board, this.current, kickX, kickY, rotated)) {
        this.current.shape = rotated;
        this.current.rotation = to;
        this.current.x += kickX;
        this.current.y += kickY;
        this.lastAction = {
          type: "rotate",
          pieceType: this.current.type,
          fromRotation: from,
          toRotation: to,
          direction,
          kickIndex: index,
          kick: { x: kickX, y: kickY }
        };
        this.events.emit("rotate", {
          direction,
          kick: { x: kickX, y: kickY },
          kickIndex: index,
          rotation: { from, to },
          state: this.getState()
        });
        return;
      }
    }
  }

  softDrop() {
    if (!this.canControl()) return;
    if (!collide(this.board, this.current, 0, 1)) {
      this.current.y++;
      this.score += this.mode.scoreSoftDrop();
      this.events.emit("softDrop", this.getState());
    }
    this.dropCounter = 0;
  }

  hardDrop() {
    if (!this.canControl()) return;
    let distance = 0;
    while (!collide(this.board, this.current, 0, 1)) {
      this.current.y++;
      distance++;
    }
    this.score += this.mode.scoreHardDrop(distance);
    this.events.emit("hardDrop", { distance, state: this.getState() });
    this.nextLandImpact = "hard";
    this.lockPiece();
  }

  holdPiece() {
    if (!this.canControl() || !this.canHold || !this.current) return;
    const outgoingType = this.current.type;
    if (this.hold) {
      this.current = createPiece(this.hold);
      this.hold = outgoingType;
    } else {
      this.hold = outgoingType;
      this.current = this.takeQueuedPiece();
    }
    this.canHold = false;
    this.lastAction = { type: "hold" };
    this.lockCounter = 0;
    this.dropCounter = 0;
    if (collide(this.board, this.current)) {
      this.handleTopOut();
      return;
    }
    this.events.emit("hold", this.getState());
  }

  gravityStep() {
    if (collide(this.board, this.current, 0, 1)) {
      this.dropCounter = 0;
      return;
    }

    this.current.y++;
    this.dropCounter = 0;
  }

  updateLockDelay(delta) {
    if (!this.isGrounded()) {
      if (this.lockCounter) {
        this.lockCounter = 0;
        this.events.emit("lockDelayEnd", this.getState());
      }
      return false;
    }

    this.lockCounter += delta;
    if (this.lockCounter >= LOCK_DELAY) {
      this.lockPiece();
      return true;
    }
    return false;
  }

  lockPiece() {
    if (this.status !== "playing") return;
    if (this.lockCounter < LOCK_DELAY && !collide(this.board, this.current, 0, 1)) {
      return;
    }

    const landedPiece = clonePiece(this.current);
    const tSpin = this.detectTSpin(this.current);
    mergePiece(this.board, this.current);
    this.lastTSpin = tSpin;
    this.current = null;
    this.lockCounter = 0;
    this.dropCounter = 0;
    const impact = this.nextLandImpact || "normal";
    this.nextLandImpact = null;
    this.events.emit("land", { piece: landedPiece, impact, tSpin, state: this.getState() });
    if (!this.startLineClear()) {
      if (tSpin) {
        this.score += this.mode.scoreTSpin(0, this.level);
      }
      this.spawnPiece();
    }
  }

  dropPiece() {
    if (collide(this.board, this.current, 0, 1)) {
      this.lockPiece();
    } else {
      this.current.y++;
    }
    this.dropCounter = 0;
  }

  startLineClear() {
    const rows = findCompletedRows(this.board);
    if (!rows.length) return false;

    const rowEffects = rows.map((row, index) => ({
      row,
      start: index * LINE_CLEAR_STAGGER,
      duration: LINE_CLEAR_DURATION
    }));
    const totalDuration = LINE_CLEAR_DURATION + (rows.length - 1) * LINE_CLEAR_STAGGER;
    this.pendingClear = {
      rows,
      rowEffects,
      totalDuration,
      boardSnapshot: cloneBoard(this.board),
      tSpin: this.lastTSpin ? { ...this.lastTSpin, lines: rows.length } : null
    };
    this.clearCounter = 0;
    this.status = "clearing";
    this.events.emit("lineClearStart", {
      ...this.pendingClear,
      state: this.getState()
    });
    return true;
  }

  updateLineClear(delta) {
    if (!this.pendingClear) return;
    this.clearCounter += delta;
    if (this.clearCounter >= this.pendingClear.totalDuration) {
      this.commitLineClear();
    }
  }

  commitLineClear() {
    if (!this.pendingClear) return;
    const cleared = clearRows(this.board, this.pendingClear.rows);
    if (!cleared) return;
    this.lines += cleared;
    this.level = this.mode.getLevel(this.lines);
    this.score += this.pendingClear.tSpin
      ? this.mode.scoreTSpin(cleared, this.level)
      : this.mode.scoreLines(cleared, this.level);
    this.dropInterval = this.mode.getDropInterval({ level: this.level, lines: this.lines });
    const committed = this.pendingClear;
    this.pendingClear = null;
    this.clearCounter = 0;
    this.status = "playing";
    this.events.emit("lineClearCommit", {
      cleared,
      rows: committed.rows,
      tSpin: committed.tSpin || null,
      state: this.getState()
    });
    this.spawnPiece();
  }

  spawnPiece() {
    this.current = this.takeQueuedPiece();
    this.canHold = true;
    this.lockCounter = 0;
    this.lastAction = null;
    this.lastTSpin = null;
    if (collide(this.board, this.current)) {
      this.handleTopOut();
      return;
    }
    this.events.emit("spawn", this.getState());
  }

  handleTopOut() {
    if (this.mode.topOut === "clearBoard") {
      this.board = createBoard();
      this.current = this.takeQueuedPiece();
      this.canHold = true;
      this.lockCounter = 0;
      this.dropCounter = 0;
      this.status = "playing";
      this.events.emit("topOutRecover", this.getState());
    } else {
      this.status = "gameOver";
      this.events.emit("gameOver", this.getState());
    }
  }

  toggleGhost() {
    this.showGhost = !this.showGhost;
    this.events.emit("ghostToggle", this.getState());
  }

  loadDebugState({ board, current, nextQueue = [], hold = null, canHold = false } = {}) {
    this.board = cloneBoard(board || createBoard());
    this.current = current ? clonePiece(current) : createPiece("T");
    this.nextQueue = nextQueue.map(type => createPiece(type));
    while (this.nextQueue.length < NEXT_PREVIEW_COUNT) {
      this.nextQueue.push(this.createNextPiece());
    }
    this.hold = hold;
    this.canHold = canHold;
    this.score = 0;
    this.lines = 0;
    this.level = this.mode.getLevel(this.lines);
    this.dropInterval = this.mode.getDropInterval({ level: this.level, lines: this.lines });
    this.dropCounter = 0;
    this.lockCounter = 0;
    this.clearCounter = 0;
    this.pendingClear = null;
    this.lastAction = null;
    this.lastTSpin = null;
    this.status = "playing";
    this.events.emit("debugLoad", this.getState());
  }

  detectTSpin(piece) {
    if (!piece || piece.type !== "T") return null;
    if (this.lastAction?.type !== "rotate" || this.lastAction.pieceType !== "T") return null;

    const corners = [
      [piece.x, piece.y],
      [piece.x + 2, piece.y],
      [piece.x, piece.y + 2],
      [piece.x + 2, piece.y + 2]
    ];
    const occupied = corners.filter(([x, y]) => this.isOccupiedForTSpin(x, y)).length;
    if (occupied < 3) return null;

    return {
      type: "full",
      occupiedCorners: occupied,
      rotation: piece.rotation || 0,
      kickIndex: this.lastAction.kickIndex,
      lines: 0
    };
  }

  isOccupiedForTSpin(x, y) {
    if (x < 0 || x >= this.board[0].length) return true;
    if (y >= this.board.length) return true;
    if (y < 0) return false;
    return Boolean(this.board[y][x]);
  }

  createNextPiece() {
    return createPiece(this.bag.take());
  }

  createNextQueue() {
    return Array.from({ length: NEXT_PREVIEW_COUNT }, () => this.createNextPiece());
  }

  takeQueuedPiece() {
    const piece = this.nextQueue.shift() || this.createNextPiece();
    this.nextQueue.push(this.createNextPiece());
    return piece;
  }

  canControl() {
    return this.status === "playing";
  }

  isGrounded() {
    return Boolean(this.current) && collide(this.board, this.current, 0, 1);
  }

  getGhostPiece() {
    const ghost = {
      type: this.current.type,
      shape: this.current.shape,
      x: this.current.x,
      y: this.current.y
    };
    while (!collide(this.board, ghost, 0, 1)) {
      ghost.y++;
    }
    return ghost;
  }

  getState() {
    return {
      board: this.board,
      current: this.current,
      next: this.nextQueue[0],
      nextQueue: this.nextQueue,
      hold: this.hold ? createPiece(this.hold) : null,
      canHold: this.canHold,
      ghost: this.current && this.showGhost && this.canControl() ? this.getGhostPiece() : null,
      score: this.score,
      lines: this.lines,
      level: this.level,
      dropInterval: this.dropInterval,
      mode: {
        id: this.mode.id,
        name: this.mode.name,
        autoGravity: this.mode.autoGravity
      },
      lockDelay: {
        active: this.status === "playing" && this.isGrounded(),
        elapsed: this.lockCounter,
        duration: LOCK_DELAY,
        progress: Math.min(1, this.lockCounter / LOCK_DELAY)
      },
      lineClear: this.pendingClear ? {
        elapsed: this.clearCounter,
        rows: this.pendingClear.rows,
        rowEffects: this.pendingClear.rowEffects,
        totalDuration: this.pendingClear.totalDuration,
        tSpin: this.pendingClear.tSpin
      } : null,
      tSpin: this.lastTSpin,
      showGhost: this.showGhost,
      status: this.status,
      running: this.status === "playing" || this.status === "paused" || this.status === "clearing",
      paused: this.status === "paused",
      gameOver: this.status === "gameOver"
    };
  }
}
