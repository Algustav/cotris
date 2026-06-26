export class MediaEffects {
  constructor() {
    this.enabled = true;
    this.assets = new Map();
    this.buffers = new Map();
    this.bufferPromises = new Map();
    this.audioContext = null;
    this.masterGain = null;
    this.volume = 0.65;
    this.musicEnabled = true;
    this.musicVolume = 0.15;
    this.musicDuckLevel = 0.15;
    this.musicFadeTimer = null;
    this.music = null;
    this.musicTrack = null;
    this.musicManifest = null;
    this.musicSequenceIndex = new Map();
    this.paths = {
      move: "../../assets/audio/e-move.wav",
      rotate: "../../assets/audio/e-rotate.wav",
      hold: "../../assets/audio/e-hold.wav",
      place: "../../assets/audio/e-place.wav",
      clear: "../../assets/audio/e-Clear.wav",
      multiClear: "../../assets/audio/e-multiClear.wav",
      theme: "../../assets/audio/e-flashTheme.wav",
      menuMove: "../../assets/audio/menuMove.wav",
      menuConfirm: "../../assets/audio/menuConfirm.wav",
      menuCancel: "../../assets/audio/menuCancel.wav"
    };
    this.musicBasePath = "../../assets/audio/music/";
    this.musicManifestPath = "../../assets/audio/music/manifest.json";
    this.preload();
  }

  connect(engine) {
    engine.on("move", () => this.play("move"));
    engine.on("moveBlocked", () => this.play("move"));
    engine.on("softDrop", () => this.play("move"));
    engine.on("rotate", () => this.play("rotate"));
    engine.on("hold", () => this.play("hold"));
    engine.on("land", () => this.play("place"));
    engine.on("lineClearStart", event => {
      this.play(event.rows.length > 1 ? "multiClear" : "clear");
    });
    engine.on("start", state => this.playMusic(state.mode.id));
    engine.on("reset", () => this.stopMusic());
    engine.on("pause", () => this.duckMusic());
    engine.on("resume", () => this.restoreMusic());
    engine.on("gameOver", () => this.stopMusic());
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stopLongEffects();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    }
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, Number(volume) || 0));
    if (this.music && !this.music.paused) {
      this.fadeMusicTo(this.musicVolume, 160);
    }
  }

  play(name, detail = {}) {
    if (!this.enabled) return;
    if (this.playBuffered(name)) return;
    this.playFallback(name);
    void detail;
  }

  preload() {
    if (typeof Audio === "undefined") return;
    Object.entries(this.paths).forEach(([name, path]) => {
      const url = new URL(path, import.meta.url);
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.volume = this.volumeFor(name);
      this.assets.set(name, audio);
      this.loadBuffer(name, url);
    });
  }

  getAudioContext() {
    if (this.audioContext) return this.audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.audioContext = new AudioContextClass();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.audioContext.destination);
    return this.audioContext;
  }

  unlock() {
    const context = this.getAudioContext();
    if (!context) return Promise.resolve(false);
    if (context.state === "suspended") {
      return context.resume().then(() => true).catch(() => false);
    }
    return Promise.resolve(true);
  }

  loadBuffer(name, url) {
    const context = this.getAudioContext();
    if (!context || typeof fetch === "undefined") return;
    const promise = fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Audio fetch failed: ${url}`);
        return response.arrayBuffer();
      })
      .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
      .then(buffer => {
        this.buffers.set(name, buffer);
        return buffer;
      })
      .catch(() => null);
    this.bufferPromises.set(name, promise);
  }

  playBuffered(name) {
    const context = this.getAudioContext();
    const buffer = this.buffers.get(name);
    if (!context || !buffer || context.state !== "running") return false;

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = this.volumeFor(name);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(0);
    return true;
  }

  playFallback(name) {
    const source = this.assets.get(name);
    if (!source) return;
    const sound = source.cloneNode();
    sound.volume = this.volumeFor(name);
    sound.play().catch(() => {});
  }

  async playMusic(modeId = "marathon") {
    if (!this.musicEnabled || typeof Audio === "undefined") return;
    const track = await this.pickMusicTrack(modeId);
    if (!track) return;
    if (!this.music || this.musicTrack !== track) {
      this.stopMusic({ resetTrack: false });
      this.music = new Audio(track);
      this.music.loop = true;
      this.music.preload = "auto";
      this.musicTrack = track;
    }
    this.music.volume = 0;
    this.music.play().then(() => {
      this.fadeMusicTo(this.musicVolume, 520);
    }).catch(error => {
      console.warn("Background music could not start.", error);
    });
  }

  async pickMusicTrack(modeId) {
    const playlist = await this.getMusicPlaylist(modeId);
    const fallbackPlaylist = playlist.tracks.length ? playlist : await this.getMusicPlaylist("shared");
    if (!fallbackPlaylist.tracks.length) return null;
    return this.pickFromPlaylist(fallbackPlaylist);
  }

  async loadMusicManifest() {
    if (this.musicManifest) return this.musicManifest;
    try {
      const response = await fetch(new URL(this.musicManifestPath, import.meta.url));
      if (!response.ok) {
        this.musicManifest = { defaultOrder: "shuffle", modes: {} };
        return this.musicManifest;
      }
      this.musicManifest = await response.json();
    } catch {
      this.musicManifest = { defaultOrder: "shuffle", modes: {} };
    }
    return this.musicManifest;
  }

  async getMusicPlaylist(modeId) {
    const manifest = await this.loadMusicManifest();
    const entry = manifest.modes?.[modeId] || [];
    const tracks = Array.isArray(entry) ? entry : entry.tracks || [];
    const order = Array.isArray(entry) ? manifest.defaultOrder : entry.order || manifest.defaultOrder;
    return {
      modeId,
      order: order === "sequence" ? "sequence" : "shuffle",
      tracks: tracks.map(track => new URL(`${this.musicBasePath}${modeId}/${track}`, import.meta.url).href)
    };
  }

  pickFromPlaylist(playlist) {
    if (playlist.order !== "sequence") {
      return playlist.tracks[Math.floor(Math.random() * playlist.tracks.length)];
    }
    const index = this.musicSequenceIndex.get(playlist.modeId) || 0;
    this.musicSequenceIndex.set(playlist.modeId, (index + 1) % playlist.tracks.length);
    return playlist.tracks[index % playlist.tracks.length];
  }

  duckMusic() {
    if (!this.music || this.music.paused) return;
    this.fadeMusicTo(this.musicVolume * this.musicDuckLevel, 360);
  }

  pauseMusic() {
    if (!this.music || this.music.paused) return;
    if (this.musicFadeTimer) {
      window.clearInterval(this.musicFadeTimer);
      this.musicFadeTimer = null;
    }
    this.music.pause();
    this.music.volume = this.musicVolume;
  }

  restoreMusic() {
    if (!this.music || this.music.paused || !this.musicEnabled) return;
    this.fadeMusicTo(this.musicVolume, 360);
  }

  stopMusic(options = {}) {
    if (this.musicFadeTimer) {
      window.clearInterval(this.musicFadeTimer);
      this.musicFadeTimer = null;
    }
    if (this.music) {
      this.music.pause();
      this.music.currentTime = 0;
      this.music.volume = this.musicVolume;
    }
    if (options.resetTrack !== false) {
      this.musicTrack = null;
    }
  }

  fadeMusicTo(targetVolume, duration = 300) {
    if (!this.music) return;
    if (this.musicFadeTimer) {
      window.clearInterval(this.musicFadeTimer);
      this.musicFadeTimer = null;
    }
    const startVolume = this.music.volume;
    const safeTarget = Math.max(0, Math.min(1, targetVolume));
    const steps = Math.max(1, Math.round(duration / 40));
    let step = 0;
    this.musicFadeTimer = window.setInterval(() => {
      step++;
      const progress = Math.min(1, step / steps);
      this.music.volume = startVolume + (safeTarget - startVolume) * progress;
      if (progress >= 1) {
        window.clearInterval(this.musicFadeTimer);
        this.musicFadeTimer = null;
      }
    }, 40);
  }

  stopLongEffects() {
    const themeSound = this.assets.get("theme");
    if (!themeSound) return;
    themeSound.pause();
    themeSound.currentTime = 0;
  }

  volumeFor(name) {
    const levels = {
      move: 0.35,
      rotate: 0.42,
      hold: 0.5,
      place: 0.55,
      clear: 0.55,
      multiClear: 0.58,
      theme: 0.5,
      menuMove: 0.28,
      menuConfirm: 0.42,
      menuCancel: 0.36
    };
    return (levels[name] ?? 0.5) * this.volume;
  }
}
