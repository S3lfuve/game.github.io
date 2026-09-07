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
  if (!dom.musicButton) return;
  dom.musicButton.classList.toggle("is-off", !runtime.musicEnabled);
  dom.musicButton.setAttribute("aria-pressed", runtime.musicEnabled ? "true" : "false");
  dom.musicButton.setAttribute("aria-label", runtime.musicEnabled ? "Music on" : "Music off");
}

function musicTargetVolume() {
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
    if (!musicState.runStarted) return;
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
