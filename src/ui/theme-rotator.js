const ROTATE_EVERY_LINES = 10;

export class ThemeRotator {
  constructor({ getThemes, getCurrentTheme, applyTheme, storageKey }) {
    this.getThemes = getThemes;
    this.getCurrentTheme = getCurrentTheme;
    this.applyTheme = applyTheme;
    this.storageKey = storageKey;
    this.enabled = localStorage.getItem(storageKey) !== "false";
    this.nextChangeAt = ROTATE_EVERY_LINES;
    this.queue = [];
  }

  connect(engine) {
    engine.on("lineClearCommit", event => this.onLineClear(event.state.lines));
    engine.on("reset", () => {
      this.nextChangeAt = ROTATE_EVERY_LINES;
    });
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.queue = [];
    localStorage.setItem(this.storageKey, String(enabled));
  }

  onLineClear(lines) {
    if (!this.enabled) return;
    if (lines < this.nextChangeAt) return;

    this.rotate();
    while (lines >= this.nextChangeAt) {
      this.nextChangeAt += ROTATE_EVERY_LINES;
    }
  }

  rotate() {
    const nextTheme = this.takeNextTheme();
    if (nextTheme) this.applyTheme(nextTheme, { persist: true, randomRotation: true });
  }

  takeNextTheme() {
    const current = this.getCurrentTheme();
    const themes = this.themesForTone(current);
    if (!themes.length) return null;

    if (!this.queue.length || !this.queue.some(id => themes.some(theme => theme.id === id))) {
      this.refillQueue(themes);
    }

    const currentId = current?.id;
    let nextId = this.queue.shift();
    if (nextId === currentId && this.queue.length) {
      this.queue.push(nextId);
      nextId = this.queue.shift();
    }
    return themes.find(theme => theme.id === nextId) || themes[0];
  }

  themesForTone(currentTheme) {
    const themes = this.getThemes();
    if (!currentTheme?.tone) return themes;
    const matchingThemes = themes.filter(theme => theme.tone === currentTheme.tone);
    return matchingThemes.length ? matchingThemes : themes;
  }

  refillQueue(themes) {
    this.queue = themes.map(theme => theme.id);
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }
}
