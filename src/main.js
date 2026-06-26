import { GameEngine } from "./game/engine.js";
import { bindInput } from "./ui/input.js";
import { CanvasRenderer } from "./ui/renderer.js";
import { Hud } from "./ui/hud.js";
import { MediaEffects } from "./ui/media.js";
import { EffectManager } from "./ui/effects/effect-manager.js";
import { MenuController } from "./ui/menu-controller.js";
import { ThemeRotator } from "./ui/theme-rotator.js";
import { listModes } from "./game/modes.js";
import { createTspinDebugState } from "./game/debug-presets.js";
import { applyCssTheme, defaultTheme, getTheme, listThemes } from "./ui/theme.js";

const elements = {
  boardScaleBox: document.querySelector(".board-scale-box"),
  boardWrap: document.querySelector(".board-wrap"),
  boardCanvas: document.querySelector("#board"),
  nextList: document.querySelector("#nextList"),
  holdCanvas: document.querySelector("#hold"),
  score: document.querySelector("#score"),
  lines: document.querySelector("#lines"),
  level: document.querySelector("#level"),
  speed: document.querySelector("#speed"),
  overlay: document.querySelector("#overlay"),
  overlayPanels: document.querySelectorAll(".overlay-panel"),
  finalScoreText: document.querySelector("#finalScoreText"),
  modeSelect: document.querySelector("#modeSelect"),
  modeDescription: document.querySelector("#modeDescription"),
  menuStartButton: document.querySelector("#menuStartButton"),
  resumeButton: document.querySelector("#resumeButton"),
  playAgainButton: document.querySelector("#playAgainButton"),
  pauseRestartButton: document.querySelector("#pauseRestartButton"),
  pauseButton: document.querySelector("#pauseButton"),
  resetButton: document.querySelector("#resetButton"),
  ghostToggle: document.querySelector("#ghostToggle"),
  themeSelect: document.querySelector("#themeSelect"),
  themeDescription: document.querySelector("#themeDescription"),
  themeSwatches: document.querySelector("#themeSwatches"),
  randomThemeToggle: document.querySelector("#randomThemeToggle"),
  soundToggle: document.querySelector("#soundToggle"),
  musicToggle: document.querySelector("#musicToggle"),
  musicVolume: document.querySelector("#musicVolume"),
  musicVolumeValue: document.querySelector("#musicVolumeValue"),
  mobileLayoutToggle: document.querySelector("#mobileLayoutToggle"),
  mobileActionsToggle: document.querySelector(".mobile-actions-toggle"),
  scoreList: document.querySelector("#scoreList"),
  touchControls: document.querySelector(".touch"),
  touchButtons: document.querySelectorAll("[data-action]"),
  effectTestButtons: document.querySelectorAll("[data-effect-test]"),
  tspinTestButtons: document.querySelectorAll("[data-tspin-test]")
};

const MODE_STORAGE_KEY = "tetris-mode";
const engine = new GameEngine(localStorage.getItem(MODE_STORAGE_KEY));
const renderer = new CanvasRenderer({
  boardCanvas: elements.boardCanvas,
  nextList: elements.nextList,
  holdCanvas: elements.holdCanvas
});
const hud = new Hud(elements);
const media = new MediaEffects();
const effects = new EffectManager({
  boardWrap: elements.boardWrap,
  holdCanvas: elements.holdCanvas,
  levelElement: elements.level,
  speedElement: elements.speed,
  overlay: elements.overlay,
  getCurrentTheme: () => activeTheme,
  onHitStop: hitStop
});
const menu = new MenuController(elements, { onShow: view => {
  if (view === "scores") renderScores();
} });
const THEME_STORAGE_KEY = "tetris-theme";
const RANDOM_THEME_STORAGE_KEY = "tetris-random-theme";
const RANDOM_THEME_DEFAULT_FIX_KEY = "tetris-random-theme-defaulted";
const SOUND_STORAGE_KEY = "tetris-sound-enabled";
const MUSIC_STORAGE_KEY = "tetris-music-enabled";
const MUSIC_VOLUME_STORAGE_KEY = "tetris-music-volume";
const MUSIC_VOLUME_FIX_KEY = "tetris-music-volume-defaulted";
const MOBILE_LAYOUT_STORAGE_KEY = "tetris-mobile-layout";
const MOBILE_LAYOUT_CHOSEN_KEY = "tetris-mobile-layout-chosen";
const DEFAULT_MUSIC_VOLUME = 0.15;
const SCORE_STORAGE_KEY = "tetris-high-scores";
const requestedTheme = new URLSearchParams(window.location.search).get("theme");

let lastTime = 0;
let activeTheme = getTheme(requestedTheme || localStorage.getItem(THEME_STORAGE_KEY) || defaultTheme.id);
let lastRecordedGameOverScore = null;
let effectPauseCounter = 0;
if (localStorage.getItem(RANDOM_THEME_DEFAULT_FIX_KEY) !== "true") {
  localStorage.setItem(RANDOM_THEME_STORAGE_KEY, "true");
  localStorage.setItem(RANDOM_THEME_DEFAULT_FIX_KEY, "true");
}
const hasChosenMobileLayout = localStorage.getItem(MOBILE_LAYOUT_CHOSEN_KEY) === "true";
let mobileLayoutEnabled = hasChosenMobileLayout
  ? localStorage.getItem(MOBILE_LAYOUT_STORAGE_KEY) === "true"
  : window.matchMedia("(max-width: 760px)").matches;
const themeRotator = new ThemeRotator({
  getThemes: listThemes,
  getCurrentTheme: () => activeTheme,
  applyTheme,
  storageKey: RANDOM_THEME_STORAGE_KEY
});

["pointerdown", "keydown", "touchstart"].forEach(eventName => {
  document.addEventListener(eventName, () => {
    media.unlock();
  }, { once: true, passive: true });
});

function setMusicVolume(volume, options = {}) {
  const safeVolume = Math.max(0, Math.min(1, Number(volume) || 0));
  elements.musicVolume.value = String(Math.round(safeVolume * 100));
  elements.musicVolumeValue.textContent = `${elements.musicVolume.value}%`;
  media.setMusicVolume(safeVolume);
  if (options.persist !== false) {
    localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, String(safeVolume));
  }
}

function hitStop(duration = 200) {
  const state = engine.getState();
  if (state.status !== "playing" && state.status !== "clearing") return;
  effectPauseCounter = Math.max(effectPauseCounter, duration);
}

function updateMobileBoardScale() {
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  if (!isMobile) {
    document.documentElement.style.setProperty("--board-scale", "1");
    return;
  }

  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  const boardHeight = elements.boardScaleBox?.dataset.naturalHeight
    ? Number(elements.boardScaleBox.dataset.naturalHeight)
    : 704;
  const boardWidth = elements.boardScaleBox?.dataset.naturalWidth
    ? Number(elements.boardScaleBox.dataset.naturalWidth)
    : 364;
  const touchHeight = elements.touchControls?.offsetHeight || 0;
  const headerHeight = mobileLayoutEnabled ? (document.querySelector(".side header")?.offsetHeight || 0) : 0;
  const previewWidth = mobileLayoutEnabled ? 128 : 0;
  const verticalPadding = 28;
  const stageGap = mobileLayoutEnabled ? 34 : 10;
  const breathingRoom = 8;
  const availableHeight = viewportHeight - headerHeight - touchHeight - verticalPadding - stageGap - breathingRoom;
  const availableWidth = viewportWidth - 28 - previewWidth;
  const heightScale = availableHeight / boardHeight;
  const widthScale = availableWidth / boardWidth;
  const minScale = mobileLayoutEnabled ? 0.48 : 0.62;
  const scale = Math.max(minScale, Math.min(1, heightScale, widthScale));
  document.documentElement.style.setProperty("--board-scale", scale.toFixed(3));
}

function applyMobileLayoutPreference() {
  document.body.classList.toggle("mobile-layout-on", mobileLayoutEnabled);
  if (!mobileLayoutEnabled) {
    document.body.classList.remove("mobile-actions-open");
    elements.mobileActionsToggle?.setAttribute("aria-expanded", "false");
  }
  if (elements.mobileLayoutToggle) {
    elements.mobileLayoutToggle.checked = mobileLayoutEnabled;
  }
  updateMobileBoardScale();
  if (window.matchMedia("(max-width: 760px)").matches) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
  requestAnimationFrame(updateMobileBoardScale);
}

function openMenuView(view) {
  const state = engine.getState();
  if (view === "menu") {
    if (state.status === "playing") {
      engine.togglePause();
    }
    media.pauseMusic();
  }
  menu.open(view);
}

function renderModeOptions() {
  elements.modeSelect.innerHTML = "";
  listModes().forEach(mode => {
    const option = document.createElement("option");
    option.value = mode.id;
    option.textContent = mode.name;
    elements.modeSelect.append(option);
  });
  elements.modeSelect.value = engine.getState().mode.id;
  updateModeDescription();
}

function updateModeDescription() {
  const mode = listModes().find(item => item.id === elements.modeSelect.value);
  elements.modeDescription.textContent = mode?.description || "";
}

function renderThemeOptions() {
  elements.themeSelect.innerHTML = "";
  listThemes().forEach(theme => {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.name;
    elements.themeSelect.append(option);
  });
  elements.themeSelect.value = activeTheme.id;
}

function commitTheme(theme) {
  activeTheme = theme;
  applyCssTheme(theme);
  renderer.setTheme(theme);
  elements.themeSelect.value = theme.id;
  elements.themeDescription.textContent = theme.description;
  elements.themeSwatches.innerHTML = "";
  Object.entries(theme.colors).forEach(([type, color]) => {
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = color;
    swatch.textContent = type;
    swatch.title = `${type}: ${color}`;
    elements.themeSwatches.append(swatch);
  });
  renderer.draw(engine.getState());
}

function applyTheme(theme, options = {}) {
  if (options.persist !== false) {
    localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  }
  if (options.randomRotation) {
    media.play("theme");
  }
  if (options.effect === false) {
    commitTheme(theme);
  } else {
    effects.themeChange(theme, () => commitTheme(theme));
  }
}

function sync() {
  const state = engine.getState();
  hud.update(state);
  menu.sync(state);
  renderer.draw(state);
}

function loadScores() {
  try {
    return JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveScore(score) {
  const scores = loadScores();
  scores.push({ score, date: new Date().toISOString() });
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scores.slice(0, 10)));
}

function renderScores() {
  const scores = loadScores();
  elements.scoreList.innerHTML = "";
  if (!scores.length) {
    const item = document.createElement("li");
    item.textContent = "暂无记录";
    elements.scoreList.append(item);
    return;
  }
  scores.forEach(entry => {
    const item = document.createElement("li");
    item.textContent = `${entry.score}`;
    elements.scoreList.append(item);
  });
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;
  if (effectPauseCounter > 0) {
    effectPauseCounter = Math.max(0, effectPauseCounter - delta);
  } else {
    engine.tick(delta);
  }
  effects.update(delta);
  renderer.draw(engine.getState());
  requestAnimationFrame(update);
}

bindInput(engine, elements);
media.connect(engine);
effects.connect(engine);
themeRotator.connect(engine);
renderer.setLineClearEffects(effects.clear);
renderer.setImpactEffects(effects.impact);
renderModeOptions();
renderThemeOptions();
applyTheme(activeTheme, { effect: false });
elements.randomThemeToggle.checked = themeRotator.enabled;
elements.soundToggle.checked = localStorage.getItem(SOUND_STORAGE_KEY) !== "false";
media.setEnabled(elements.soundToggle.checked);
elements.musicToggle.checked = localStorage.getItem(MUSIC_STORAGE_KEY) !== "false";
media.setMusicEnabled(elements.musicToggle.checked);
const savedMusicVolume = localStorage.getItem(MUSIC_VOLUME_STORAGE_KEY);
const parsedMusicVolume = savedMusicVolume === null ? DEFAULT_MUSIC_VOLUME : Number(savedMusicVolume);
const initialMusicVolume = Number.isFinite(parsedMusicVolume) ? parsedMusicVolume : DEFAULT_MUSIC_VOLUME;
setMusicVolume(initialMusicVolume, { persist: savedMusicVolume !== null });
if (elements.musicToggle.checked && savedMusicVolume === "0" && localStorage.getItem(MUSIC_VOLUME_FIX_KEY) !== "true") {
  setMusicVolume(DEFAULT_MUSIC_VOLUME);
  localStorage.setItem(MUSIC_VOLUME_FIX_KEY, "true");
}
elements.themeSelect.addEventListener("change", () => {
  applyTheme(getTheme(elements.themeSelect.value));
});
elements.randomThemeToggle.addEventListener("change", () => {
  themeRotator.setEnabled(elements.randomThemeToggle.checked);
});
elements.soundToggle.addEventListener("change", () => {
  media.setEnabled(elements.soundToggle.checked);
  localStorage.setItem(SOUND_STORAGE_KEY, String(elements.soundToggle.checked));
  if (elements.soundToggle.checked) {
    media.unlock();
    media.play("menuConfirm");
  }
});
elements.musicToggle.addEventListener("change", () => {
  media.setMusicEnabled(elements.musicToggle.checked);
  localStorage.setItem(MUSIC_STORAGE_KEY, String(elements.musicToggle.checked));
  if (elements.musicToggle.checked && media.musicVolume === 0) {
    setMusicVolume(DEFAULT_MUSIC_VOLUME);
  }
  const state = engine.getState();
  if (elements.musicToggle.checked && (state.status === "playing" || state.status === "clearing")) {
    media.playMusic(state.mode.id);
  }
});
elements.musicVolume.addEventListener("input", () => {
  const volume = Number(elements.musicVolume.value) / 100;
  setMusicVolume(volume);
});
elements.mobileLayoutToggle?.addEventListener("change", () => {
  mobileLayoutEnabled = Boolean(elements.mobileLayoutToggle.checked);
  localStorage.setItem(MOBILE_LAYOUT_CHOSEN_KEY, "true");
  localStorage.setItem(MOBILE_LAYOUT_STORAGE_KEY, String(mobileLayoutEnabled));
  applyMobileLayoutPreference();
});
elements.mobileActionsToggle?.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("mobile-actions-open");
  elements.mobileActionsToggle.setAttribute("aria-expanded", String(isOpen));
  updateMobileBoardScale();
});
elements.modeSelect.addEventListener("change", () => {
  localStorage.setItem(MODE_STORAGE_KEY, elements.modeSelect.value);
  updateModeDescription();
});
elements.menuStartButton.addEventListener("click", () => {
  media.unlock();
  media.play("menuConfirm");
  engine.setMode(elements.modeSelect.value);
  engine.start();
});
elements.resumeButton.addEventListener("click", () => {
  media.play("menuConfirm");
  engine.togglePause();
});
elements.playAgainButton.addEventListener("click", () => {
  media.play("menuConfirm");
  engine.restart();
});
elements.pauseRestartButton.addEventListener("click", () => {
  media.play("menuConfirm");
  engine.restart();
});
elements.pauseButton.addEventListener("click", () => {
  media.play("menuConfirm");
  document.body.classList.remove("mobile-actions-open");
  elements.mobileActionsToggle?.setAttribute("aria-expanded", "false");
  engine.togglePause();
});
elements.resetButton.addEventListener("click", () => {
  media.play("menuConfirm");
  document.body.classList.remove("mobile-actions-open");
  elements.mobileActionsToggle?.setAttribute("aria-expanded", "false");
  engine.restart();
});
elements.ghostToggle.addEventListener("change", () => {
  if (engine.getState().showGhost !== elements.ghostToggle.checked) {
    engine.toggleGhost();
  }
});
document.querySelectorAll("[data-open-view]").forEach(button => {
  button.addEventListener("click", () => {
    media.play("menuConfirm");
    document.body.classList.remove("mobile-actions-open");
    elements.mobileActionsToggle?.setAttribute("aria-expanded", "false");
    openMenuView(button.dataset.openView);
  });
});
document.querySelectorAll("[data-back]").forEach(button => {
  button.addEventListener("click", () => {
    media.play("menuConfirm");
    menu.back(engine.getState());
  });
});
elements.effectTestButtons.forEach(button => {
  button.addEventListener("click", () => {
    effects.test(button.dataset.effectTest, engine.getState(), activeTheme);
  });
});
elements.tspinTestButtons.forEach(button => {
  button.addEventListener("click", () => {
    const presetName = button.dataset.tspinTest;
    if (presetName === "clear") {
      engine.restart();
      return;
    }
    const debugState = createTspinDebugState(presetName);
    if (!debugState) return;
    media.play("menuConfirm");
    media.pauseMusic();
    engine.loadDebugState(debugState);
  });
});
document.addEventListener("pointerdown", event => {
  if (!elements.overlay.classList.contains("show")) return;
  if (menu.isEventInsideActivePanel(event)) return;
  if (event.target.closest("button, a, input, select, textarea")) return;
  if (menu.dismiss(engine.getState())) media.play("menuConfirm");
});
document.addEventListener("dblclick", event => {
  if (window.matchMedia("(max-width: 760px)").matches) {
    event.preventDefault();
  }
}, { passive: false });
window.addEventListener("resize", updateMobileBoardScale);
window.addEventListener("orientationchange", updateMobileBoardScale);
window.visualViewport?.addEventListener("resize", updateMobileBoardScale);
if (window.ResizeObserver && elements.touchControls) {
  new ResizeObserver(updateMobileBoardScale).observe(elements.touchControls);
}
["reset", "start", "pause", "resume", "softDrop", "hardDrop", "hold", "gameOver", "lineClearStart", "lineClearCommit", "modeChange", "topOutRecover", "debugLoad", "spawn"].forEach(eventName => {
  engine.on(eventName, sync);
});
engine.on("ghostToggle", () => {
  const state = engine.getState();
  hud.update(state);
  renderer.draw(state);
});
engine.on("gameOver", state => {
  if (lastRecordedGameOverScore !== state.score) {
    saveScore(state.score);
    lastRecordedGameOverScore = state.score;
  }
  renderScores();
});
engine.on("start", () => {
  lastRecordedGameOverScore = null;
});

applyMobileLayoutPreference();
sync();
requestAnimationFrame(update);
