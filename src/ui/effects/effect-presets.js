export const effectPresets = {
  classic: {
    id: "classic",
    name: "Classic",
    motion: "bump",
    land: "impact",
    hardDrop: "strongImpact",
    clear: "scanline",
    hold: "holdPulse",
    themeChange: "boardFlash",
    levelUp: "hudPulse",
    gameStart: "boardIntro",
    gameOver: "fadeSnap",
    danger: "none"
  }
};

export const defaultEffectPreset = effectPresets.classic;
