"use strict";

const MUSIC_STORAGE_KEY = "timeKillerMusicEnabled";
const MUSIC_NORMAL_VOLUME = 0.25;
const MUSIC_PAUSE_VOLUME = 0.1;
const MUSIC_FADE_MS = 260;
const musicState = {
  audio: null,
  fadeFrame: null,
  fadeEndTimer: null,
  pauseTimer: null,
  runStarted: false,
  savedTime: 0,
  hasRunStartPosition: false,
};

function loadMusicEnabled() {
  try {
    const raw = window.localStorage?.getItem(MUSIC_STORAGE_KEY);
    if (raw === null || raw === undefined) return true;
    return raw !== "false";
  } catch (error) {
    return true;
  }
}

function saveMusicEnabled() {
  try {
    window.localStorage?.setItem(MUSIC_STORAGE_KEY, runtime.musicEnabled ? "true" : "false");
  } catch (error) {}
}

function ensureMusicAudio() {
  if (!musicState.audio) {
    const audio = new Audio("music.mp3");
    audio.loop = true;
    audio.preload = "metadata";
    audio.volume = 0;
    musicState.audio = audio;
  }
  return musicState.audio;
}

function updateMusicButton() {
  if (!dom.musicToggle) return;
  dom.musicToggle.classList.toggle("is-off", !runtime.musicEnabled);
  dom.musicToggle.setAttribute("aria-pressed", runtime.musicEnabled ? "true" : "false");
  dom.musicToggle.setAttribute("aria-label", runtime.musicEnabled ? "Выключить музыку" : "Включить музыку");
  if (dom.musicToggleState) dom.musicToggleState.textContent = runtime.musicEnabled ? "Вкл." : "Выкл.";
}

function musicTargetVolume() {
  if (!runtime.foreground) return 0;
  if (!musicState.runStarted || runtime.mode === "menu") return 0;
  if (!runtime.musicEnabled) return 0;
  if (runtime.mode === "paused") return MUSIC_PAUSE_VOLUME;
  return MUSIC_NORMAL_VOLUME;
}

function setMusicGainNow(value) {
  const target = clamp(value, 0, 1);
  if (musicState.audio) musicState.audio.volume = target;
}

function cancelMusicFade() {
  window.cancelAnimationFrame(musicState.fadeFrame);
  window.clearTimeout(musicState.fadeEndTimer);
  window.clearTimeout(musicState.pauseTimer);
  musicState.fadeFrame = null;
  musicState.fadeEndTimer = null;
  musicState.pauseTimer = null;
}

function fadeMusicVolume(targetVolume, options = {}) {
  const audio = ensureMusicAudio();
  if (!runtime.foreground) {
    cancelMusicFade();
    audio.pause();
    audio.volume = 0;
    return;
  }
  const duration = options.duration ?? MUSIC_FADE_MS;
  const pauseWhenDone = options.pauseWhenDone || false;
  const resetWhenDone = options.resetWhenDone || false;
  const target = clamp(targetVolume, 0, 1);
  cancelMusicFade();

  const finish = () => {
    audio.volume = target;
    if (pauseWhenDone) {
      musicState.pauseTimer = window.setTimeout(() => {
        if (!resetWhenDone && Number.isFinite(audio.currentTime)) {
          musicState.savedTime = audio.currentTime;
        }
        audio.pause();
        if (resetWhenDone) {
          try {
            audio.currentTime = 0;
          } catch (error) {}
        }
      }, 70);
    } else if (resetWhenDone) {
      try {
        audio.currentTime = 0;
      } catch (error) {}
    }
  };

  if (target > 0 && audio.paused) {
    setMusicGainNow(0);
    const playResult = audio.play();
    if (playResult?.catch) playResult.catch(() => {});
  }

  if (duration <= 0 || Math.abs(audio.volume - target) < 0.01) {
    finish();
    return;
  }

  const startVolume = audio.volume;
  const startTime = performance.now();
  const step = () => {
    const progress = clamp((performance.now() - startTime) / duration, 0, 1);
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    audio.volume = startVolume + (target - startVolume) * eased;
    if (progress >= 1) {
      musicState.fadeFrame = null;
      finish();
      return;
    }
    musicState.fadeFrame = window.requestAnimationFrame(step);
  };
  musicState.fadeFrame = window.requestAnimationFrame(step);
}

function syncMusicVolume(options = {}) {
  fadeMusicVolume(musicTargetVolume(), options);
}

function startRunMusic() {
  musicState.runStarted = true;
  updateMusicButton();
  if (!runtime.musicEnabled) return;

  const audio = ensureMusicAudio();
  cancelMusicFade();
  const startPlayback = () => {
    if (!musicState.runStarted || !runtime.foreground || !runtime.musicEnabled) return;
    if (!musicState.hasRunStartPosition && Number.isFinite(audio.duration) && audio.duration > 2) {
      try {
        audio.currentTime = Math.random() * Math.max(1, audio.duration - 1);
        musicState.hasRunStartPosition = true;
      } catch (error) {}
    } else if (musicState.savedTime > 0 && Number.isFinite(audio.duration)) {
      try {
        audio.currentTime = Math.min(musicState.savedTime, Math.max(0, audio.duration - 0.5));
      } catch (error) {}
    }
    setMusicGainNow(0);
    const playResult = audio.play();
    if (playResult?.then) {
      playResult
        .then(() => syncMusicVolume())
        .catch(() => {});
    } else {
      syncMusicVolume();
    }
  };

  if (audio.readyState >= 1) {
    startPlayback();
  } else {
    setMusicGainNow(0);
    audio.addEventListener("loadedmetadata", startPlayback, { once: true });
    audio.load();
    const primeResult = audio.play();
    if (primeResult?.catch) primeResult.catch(() => {});
  }
}

function stopRunMusic(immediate = false) {
  musicState.runStarted = false;
  musicState.savedTime = 0;
  musicState.hasRunStartPosition = false;
  if (!musicState.audio) return;
  fadeMusicVolume(0, {
    duration: immediate ? 0 : MUSIC_FADE_MS,
    pauseWhenDone: true,
    resetWhenDone: true,
  });
}

function setMusicPaused(paused) {
  if (!musicState.runStarted || !runtime.musicEnabled) return;
  syncMusicVolume({ duration: MUSIC_FADE_MS });
}

function setMusicEnabled(enabled) {
  runtime.musicEnabled = Boolean(enabled);
  saveMusicEnabled();
  updateMusicButton();

  if (!musicState.runStarted) return;
  if (!runtime.musicEnabled) {
    if (musicState.audio && Number.isFinite(musicState.audio.currentTime)) {
      musicState.savedTime = musicState.audio.currentTime;
    }
    syncMusicVolume({ duration: MUSIC_FADE_MS, pauseWhenDone: true });
    return;
  }

  if (!musicState.audio) {
    startRunMusic();
    return;
  }

  if (musicState.audio.paused && musicState.savedTime > 0 && Number.isFinite(musicState.audio.duration)) {
    try {
      musicState.audio.currentTime = Math.min(musicState.savedTime, Math.max(0, musicState.audio.duration - 0.5));
    } catch (error) {}
  }
  syncMusicVolume({ duration: MUSIC_FADE_MS });
}

function toggleMusic() {
  setMusicEnabled(!runtime.musicEnabled);
}

function setForeground(active) {
  const next = Boolean(active) && !document.hidden;
  if (runtime.foreground === next) return;
  runtime.foreground = next;
  if (!next) {
    runtime.scene?.pauseRun();
    cancelMusicFade();
    if (musicState.audio) {
      musicState.savedTime = musicState.audio.currentTime;
      musicState.audio.pause();
      musicState.audio.volume = 0;
    }
  } else {
    syncMusicVolume();
    syncPauseButtonPosition();
  }
}

function bindAppLifecycle() {
  let windowFocused = true;
  const sync = () => setForeground(windowFocused && !document.hidden);
  window.addEventListener("blur", () => { windowFocused = false; sync(); });
  window.addEventListener("focus", () => { windowFocused = true; sync(); });
  window.addEventListener("pagehide", () => setForeground(false));
  window.addEventListener("pageshow", sync);
  document.addEventListener("visibilitychange", sync);
}

const VIBRATION_STORAGE_KEY = "timeKillerVibrationEnabled";

function loadVibrationEnabled() {
  try {
    const raw = window.localStorage?.getItem(VIBRATION_STORAGE_KEY);
    if (raw === null || raw === undefined) return true;
    return raw !== "false";
  } catch (error) {
    return true;
  }
}

function saveVibrationEnabled() {
  try {
    window.localStorage?.setItem(VIBRATION_STORAGE_KEY, runtime.vibrationEnabled ? "true" : "false");
  } catch (error) {}
}

function updateVibrationButton() {
  if (!dom.vibrationToggle) return;
  dom.vibrationToggle.classList.toggle("is-off", !runtime.vibrationEnabled);
  dom.vibrationToggle.setAttribute("aria-pressed", runtime.vibrationEnabled ? "true" : "false");
  dom.vibrationToggle.setAttribute("aria-label", runtime.vibrationEnabled ? "Выключить вибрацию" : "Включить вибрацию");
  if (dom.vibrationToggleState) dom.vibrationToggleState.textContent = runtime.vibrationEnabled ? "Вкл." : "Выкл.";
}

function setVibrationEnabled(enabled) {
  runtime.vibrationEnabled = Boolean(enabled);
  saveVibrationEnabled();
  updateVibrationButton();
  if (!runtime.vibrationEnabled && typeof navigator.vibrate === "function") navigator.vibrate(0);
}

function toggleVibration() {
  const enabled = !runtime.vibrationEnabled;
  setVibrationEnabled(enabled);
  if (enabled) triggerHaptic("light");
}

function vibrationFallback(duration) {
  if (typeof navigator.vibrate === "function") navigator.vibrate(duration);
}

function triggerHaptic(strength = "light") {
  if (!runtime.vibrationEnabled) return;
  vibrationFallback(strength === "medium" ? 30 : strength === "veryLight" ? 8 : 15);
}
