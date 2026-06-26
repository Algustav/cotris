const SUB_VIEWS = new Set(["settings", "scores", "help"]);

export class MenuController {
  constructor(elements, { onShow } = {}) {
    this.elements = elements;
    this.onShow = onShow;
    this.history = [];
  }

  get activePanel() {
    return [...this.elements.overlayPanels].find(panel => panel.classList.contains("active"));
  }

  get activeView() {
    return this.activePanel?.dataset.view || null;
  }

  open(view, options = {}) {
    const { remember = true, resetHistory = false } = options;
    const current = this.activeView;
    if (resetHistory) this.history = [];
    if (remember && current && current !== view) {
      this.history.push(current);
    }
    this.show(view);
  }

  show(view) {
    if (view === "scores") this.onShow?.(view);
    this.elements.overlayPanels.forEach(panel => {
      panel.classList.toggle("active", panel.dataset.view === view);
    });
    this.elements.overlay.classList.add("show");
  }

  hide() {
    this.elements.overlay.classList.remove("show");
  }

  sync(state) {
    if (state.status === "idle") {
      this.open("menu", { remember: false, resetHistory: true });
    } else if (state.status === "paused") {
      this.open("pause", { remember: false, resetHistory: true });
    } else if (state.status === "gameOver") {
      this.elements.finalScoreText.textContent = `最终分数：${state.score}`;
      this.open("gameOver", { remember: false, resetHistory: true });
    } else if (!SUB_VIEWS.has(this.activeView)) {
      this.hide();
    }
  }

  back(state) {
    if (state.status === "playing") {
      this.hide();
      return;
    }

    const previous = this.history.pop();
    if (previous) {
      this.show(previous);
      return;
    }

    this.sync(state);
  }

  dismiss(state) {
    if (!this.elements.overlay.classList.contains("show")) return false;
    if (this.isLockedRoot(state)) return false;
    this.back(state);
    return true;
  }

  isLockedRoot(state) {
    const view = this.activeView;
    return (
      (state.status === "idle" && view === "menu") ||
      (state.status === "paused" && view === "pause") ||
      (state.status === "gameOver" && view === "gameOver")
    );
  }

  isEventInsideActivePanel(event) {
    return Boolean(this.activePanel?.contains(event.target));
  }
}
