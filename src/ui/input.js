export function bindInput(engine, elements) {
  const repeatableTouchActions = new Set(["left", "right", "down"]);
  const repeatDelay = 160;
  const repeatIntervals = {
    left: 55,
    right: 55,
    down: 45
  };
  let touchRepeatTimer = null;
  let activeTouchButton = null;

  const runAction = action => {
    if (action === "left") engine.moveLeft();
    if (action === "right") engine.moveRight();
    if (action === "rotate") engine.rotate(1);
    if (action === "rotateLeft") engine.rotate(-1);
    if (action === "down") engine.softDrop();
    if (action === "drop") engine.hardDrop();
    if (action === "hold") engine.holdPiece();
  };

  const stopTouchRepeat = () => {
    if (touchRepeatTimer) {
      window.clearTimeout(touchRepeatTimer);
      touchRepeatTimer = null;
    }
    activeTouchButton?.classList.remove("is-pressed");
    activeTouchButton = null;
  };

  const startTouchRepeat = action => {
    const tick = () => {
      runAction(action);
      touchRepeatTimer = window.setTimeout(tick, repeatIntervals[action] || 55);
    };
    touchRepeatTimer = window.setTimeout(tick, repeatDelay);
  };

  document.addEventListener("keydown", event => {
    if (event.code === "KeyP") {
      engine.togglePause();
      return;
    }
    if (event.code === "Enter" && (!engine.getState().running || engine.getState().gameOver)) {
      engine.start();
      return;
    }

    const handled = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space", "KeyC", "KeyZ", "KeyX"].includes(event.code);
    if (handled) event.preventDefault();
    if (event.code === "ArrowLeft") engine.moveLeft();
    if (event.code === "ArrowRight") engine.moveRight();
    if (event.code === "ArrowDown") engine.softDrop();
    if (event.code === "ArrowUp" || event.code === "KeyX") engine.rotate(1);
    if (event.code === "KeyZ") engine.rotate(-1);
    if (event.code === "Space") engine.hardDrop();
    if (event.code === "KeyC") engine.holdPiece();
  });

  elements.touchButtons.forEach(button => {
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      stopTouchRepeat();
      const action = button.dataset.action;
      activeTouchButton = button;
      button.classList.add("is-pressed");
      button.setPointerCapture?.(event.pointerId);
      runAction(action);
      if (repeatableTouchActions.has(action)) {
        startTouchRepeat(action);
      }
    });
    button.addEventListener("pointerup", event => {
      event.preventDefault();
      button.releasePointerCapture?.(event.pointerId);
      stopTouchRepeat();
    });
    button.addEventListener("pointercancel", stopTouchRepeat);
    button.addEventListener("pointerleave", stopTouchRepeat);
    button.addEventListener("contextmenu", event => event.preventDefault());
  });
  window.addEventListener("blur", stopTouchRepeat);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopTouchRepeat();
  });
}
