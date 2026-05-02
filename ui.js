"use strict";

const dom = {
  shell: document.getElementById("game-shell"),
  container: document.getElementById("game-container"),
  menu: document.getElementById("main-menu"),
  menuCard: document.querySelector(".menu-card"),
  menuRain: document.getElementById("menu-rain"),
  gameOver: document.getElementById("game-over"),
  resultCard: document.querySelector(".result-card"),
  pauseScreen: document.getElementById("pause-screen"),
  upgradeScreen: document.getElementById("upgrade-screen"),
  upgradeOptions: document.getElementById("upgrade-options"),
  leaderboardButton: document.getElementById("leaderboard-button"),
  leaderboardPanel: document.getElementById("leaderboard-panel"),
  leaderboardCategoryButton: document.getElementById("leaderboard-category-button"),
  leaderboardCategoryLabel: document.getElementById("leaderboard-category-label"),
  leaderboardCategoryMenu: document.getElementById("leaderboard-category-menu"),
  leaderboardList: document.getElementById("leaderboard-list"),
  leaderboardPlayerRank: document.getElementById("leaderboard-player-rank"),
  settingsButton: document.getElementById("settings-button"),
  settingsPanel: document.getElementById("settings-panel"),
  settingControlRow: document.getElementById("setting-control-type-row"),
  settingJoystickRow: document.getElementById("setting-joystickOpacity")?.closest(".settings-row"),
  settingLabels: {
    controlType: document.getElementById("setting-controlType"),
    hudPosition: document.getElementById("setting-hudPosition"),
    joystickOpacity: document.getElementById("setting-joystickOpacity"),
  },
  pauseButton: document.getElementById("pause-button"),
  musicButton: document.getElementById("music-button"),
  playButton: document.getElementById("play-button"),
  restartButton: document.getElementById("restart-button"),
  menuButton: document.getElementById("menu-button"),
  resumeButton: document.getElementById("resume-button"),
  pauseMenuButton: document.getElementById("pause-menu-button"),
  hud: document.getElementById("hud"),
  wave: document.getElementById("hud-wave"),
  time: document.getElementById("hud-time"),
  hpText: document.getElementById("hud-hp-text"),
  hpFill: document.getElementById("hp-fill"),
  level: document.getElementById("hud-level"),
  expText: document.getElementById("hud-exp-text"),
  expFill: document.getElementById("exp-fill"),
  levelToast: document.getElementById("level-toast"),
  damageVignette: document.getElementById("damage-vignette"),
  fadeLayer: document.getElementById("fade-layer"),
  joystick: document.getElementById("joystick"),
  joystickKnob: document.getElementById("joystick-knob"),
  statTime: document.getElementById("stat-time"),
  statLevel: document.getElementById("stat-level"),
  statWave: document.getElementById("stat-wave"),
  statKills: document.getElementById("stat-kills"),
  statExp: document.getElementById("stat-exp"),
  nicknamePanel: document.getElementById("nickname-panel"),
  nicknameInput: document.getElementById("nickname-input"),
  nicknameSaveButton: document.getElementById("nickname-save-button"),
};

const runtime = {
  mode: "menu",
  scene: null,
  lastSummary: null,
  pendingStart: false,
  settings: null,
  musicEnabled: true,
  leaderboardCategory: "score",
  leaderboardRequestId: 0,
  leaderboardRun: null,
  pendingLeaderboardRun: null,
};

const SETTINGS_STORAGE_KEY = "timeKillerSettings";

const SETTING_OPTIONS = {
  controlType: [
    { value: "keyboard", label: "Клавиатура" },
    { value: "joystick", label: "Джойстик" },
    { value: "cursor", label: "Курсор" },
    { value: "combined", label: "Комбинированное" },
  ],
  hudPosition: [
    { value: "top", label: "Сверху" },
    { value: "bottom", label: "Снизу" },
  ],
  joystickOpacity: [
    { value: "0", label: "0%" },
    { value: "25", label: "25%" },
    { value: "50", label: "50%" },
    { value: "75", label: "75%" },
  ],
};

function defaultSettings() {
  return {
    controlType: "combined",
    hudPosition: isMobileViewport() ? "top" : "bottom",
    joystickOpacity: "75",
  };
}

function isValidSetting(key, value) {
  return SETTING_OPTIONS[key]?.some((option) => option.value === value) || false;
}

function loadSettings() {
  const settings = defaultSettings();
  try {
    const raw = window.localStorage?.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return settings;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return settings;

    Object.keys(SETTING_OPTIONS).forEach((key) => {
      if (isValidSetting(key, parsed[key])) settings[key] = parsed[key];
    });
  } catch (error) {
    return settings;
  }
  return settings;
}

function saveSettings() {
  try {
    window.localStorage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(runtime.settings));
  } catch (error) {}
}

function settingLabel(key, value) {
  return SETTING_OPTIONS[key]?.find((option) => option.value === value)?.label || value;
}

function isJoystickOpacityLocked() {
  if (!runtime.settings || isMobileViewport()) return false;
  return runtime.settings.controlType === "keyboard" || runtime.settings.controlType === "cursor";
}

function updateSettingsUi(skipKey = "") {
  if (!runtime.settings) return;
  Object.keys(dom.settingLabels).forEach((key) => {
    if (key !== skipKey && dom.settingLabels[key]) {
      dom.settingLabels[key].textContent = settingLabel(key, runtime.settings[key]);
    }
  });
  dom.settingControlRow?.classList.toggle("hidden", isMobileViewport());
  const joystickLocked = isJoystickOpacityLocked();
  dom.settingJoystickRow?.classList.toggle("is-disabled", joystickLocked);
  dom.settingJoystickRow?.querySelectorAll(".settings-arrow").forEach((button) => {
    button.disabled = joystickLocked;
    button.setAttribute("aria-disabled", joystickLocked ? "true" : "false");
  });
}

function syncSettingsPanelHeight() {
  if (!dom.settingsPanel || !dom.menuCard) return;
  if (window.matchMedia?.("(max-width: 1180px)")?.matches) {
    dom.settingsPanel.style.removeProperty("--settings-panel-height");
    dom.leaderboardPanel?.style.removeProperty("--settings-panel-height");
    syncMobileLeaderboardOffset();
    return;
  }
  dom.menu?.style.removeProperty("--leaderboard-mobile-shift");
  const height = Math.round(dom.menuCard.getBoundingClientRect().height);
  if (height > 0) {
    dom.settingsPanel.style.setProperty("--settings-panel-height", `${height}px`);
    dom.leaderboardPanel?.style.setProperty("--settings-panel-height", `${height}px`);
  }
}

function syncMobileLeaderboardOffset() {
  if (!dom.menu || !dom.menuCard || !dom.leaderboardPanel) return;
  if (!isMobileViewport()) {
    dom.menu.style.removeProperty("--leaderboard-mobile-shift");
    return;
  }
  const panelRect = dom.leaderboardPanel.getBoundingClientRect();
  const menuRect = dom.menuCard.getBoundingClientRect();
  const baseTop = Number.isFinite(dom.menuCard.offsetTop) ? dom.menuCard.offsetTop : menuRect.top;
  const requiredShift = Math.ceil(panelRect.bottom + 12 - baseTop);
  const shift = Math.max(82, requiredShift);
  dom.menu.style.setProperty("--leaderboard-mobile-shift", `${shift}px`);
}

function syncNicknamePanelPosition() {
  if (!dom.gameOver || !dom.resultCard || !dom.nicknamePanel) return;
  const resultHeight = Math.round(dom.resultCard.getBoundingClientRect().height);
  const nicknameHeight = Math.round(dom.nicknamePanel.getBoundingClientRect().height);
  if (resultHeight > 0) dom.gameOver.style.setProperty("--result-card-half", `${Math.round(resultHeight / 2)}px`);
  if (nicknameHeight > 0) dom.gameOver.style.setProperty("--nickname-panel-half", `${Math.round(nicknameHeight / 2)}px`);
}

function setNicknamePanelActive(active) {
  if (!dom.nicknamePanel || !dom.nicknameInput || !dom.nicknameSaveButton) return;
  dom.nicknamePanel.setAttribute("aria-hidden", active ? "false" : "true");
  dom.nicknamePanel.classList.toggle("is-active", active);
  dom.nicknameInput.disabled = !active;
  dom.nicknameInput.tabIndex = active ? 0 : -1;
  if (!active) {
    dom.nicknameInput.blur();
    dom.nicknameSaveButton.disabled = true;
  } else {
    updateNicknameButton();
  }
}

function applySettings(skipLabelKey = "") {
  if (!runtime.settings) return;
  const hudTop = runtime.settings.hudPosition === "top";
  dom.shell.dataset.hudPosition = runtime.settings.hudPosition;
  dom.hud.classList.toggle("hud-top", hudTop);
  dom.hud.classList.toggle("hud-bottom", !hudTop);
  dom.levelToast.classList.toggle("toast-below-hud", hudTop);
  dom.joystick.style.setProperty("--joystick-opacity", String(Number(runtime.settings.joystickOpacity) / 100));
  updateSettingsUi(skipLabelKey);
  syncSettingsPanelHeight();
  positionLevelToast();
  runtime.scene?.applyRuntimeSettings();
}

function animateSettingLabel(key) {
  const label = dom.settingLabels[key];
  if (!label || !runtime.settings) return;
  window.clearTimeout(label._settingSwapTimer);
  window.clearTimeout(label._settingEnterTimer);
  label.classList.remove("value-enter");
  label.classList.add("value-exit");
  label._settingSwapTimer = window.setTimeout(() => {
    label.textContent = settingLabel(key, runtime.settings[key]);
    label.classList.remove("value-exit");
    void label.offsetWidth;
    label.classList.add("value-enter");
    label._settingEnterTimer = window.setTimeout(() => {
      label.classList.remove("value-enter");
    }, 190);
  }, 70);
}

function cycleSetting(key, direction) {
  const options = SETTING_OPTIONS[key];
  if (!options || !runtime.settings) return;
  if (key === "joystickOpacity" && isJoystickOpacityLocked()) return;
  const currentIndex = Math.max(0, options.findIndex((option) => option.value === runtime.settings[key]));
  const nextIndex = (currentIndex + direction + options.length) % options.length;
  runtime.settings[key] = options[nextIndex].value;
  saveSettings();
  applySettings(key);
  animateSettingLabel(key);
}

const MENU_RAIN_TYPES = ["circle", "square", "triangle", "pentagon", "hexagon"];
const menuRainState = {
  shapes: [],
  active: new Set(),
  recentSpawns: [],
  spawnTimer: null,
  running: false,
  seed: 0,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomDirection() {
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function desiredMenuRainCount() {
  const width = window.innerWidth;
  if (width < 520) return 9;
  if (width < 820) return 12;
  const count = clamp(Math.round(width / 78), 16, 24);
  return isDesktopPointer() ? Math.max(count + 1, Math.ceil(count * 1.05)) : count;
}

function menuRainSpawnDelay() {
  return window.innerWidth < 620 ? randomRange(620, 1050) : randomRange(390, 820);
}

function createMenuShapeElement() {
  const element = document.createElement("span");
  element.className = "menu-shape";
  element.addEventListener("animationend", () => releaseMenuShape(element));
  element.addEventListener("pointerdown", handleMenuShapePointerDown);
  return element;
}

function releaseMenuShape(element) {
  element.className = "menu-shape";
  menuRainState.active.delete(element);
  element.__rainData = null;
}

function isDesktopPointer() {
  return window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches || false;
}

function handleMenuShapePointerDown(event) {
  if (!isDesktopPointer() || event.button !== 0 || event.pointerType !== "mouse") return;
  const element = event.currentTarget;
  if (!menuRainState.active.has(element)) return;
  event.preventDefault();
  event.stopPropagation();
  popMenuShape(element);
}

function popMenuShape(element) {
  const rect = element.getBoundingClientRect();
  const root = dom.menuRain.getBoundingClientRect();
  const size = Math.max(1, rect.width || element.__rainData?.size || 22);
  element.style.setProperty("--pop-x", `${(rect.left - root.left + rect.width / 2).toFixed(1)}px`);
  element.style.setProperty("--pop-y", `${(rect.top - root.top + rect.height / 2).toFixed(1)}px`);
  element.style.setProperty("--pop-half", `${(size / 2).toFixed(1)}px`);
  element.style.setProperty("--size", `${size.toFixed(1)}px`);
  element.className = `menu-shape menu-shape-${element.__rainData?.type || "circle"} is-popping`;
}

function clearMenuRain() {
  window.clearTimeout(menuRainState.spawnTimer);
  menuRainState.spawnTimer = null;
  menuRainState.recentSpawns = [];
  Array.from(menuRainState.active).forEach((element) => releaseMenuShape(element));
}

function pickMenuRainSpawn(size) {
  const now = performance.now();
  const width = Math.max(1, window.innerWidth);
  const minGap = clamp(((size + 38) / width) * 100, 9, 18);
  menuRainState.recentSpawns = menuRainState.recentSpawns.filter((entry) => now - entry.time < 1500);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const x = randomRange(4, 96);
    const hasNearSpawn = menuRainState.recentSpawns.some((entry) => Math.abs(entry.x - x) < minGap);
    if (hasNearSpawn) continue;
    return { x, now };
  }

  return null;
}

function configureMenuShape(element) {
  const type = MENU_RAIN_TYPES[Math.floor(Math.random() * MENU_RAIN_TYPES.length)];
  const size = randomRange(15, type === "pentagon" ? 31 : 27) * (isDesktopPointer() ? 1.1 : 1);
  const spawn = pickMenuRainSpawn(size);
  if (!spawn) return false;

  const duration = randomRange(10.5, 17.5);
  const sway = randomRange(-34, 34);
  const startRotation = randomRange(-30, 30);
  const endRotation = startRotation + randomRange(140, 390) * (Math.random() < 0.5 ? -1 : 1);

  element.className = `menu-shape menu-shape-${type}`;
  element.style.setProperty("--size", `${size.toFixed(1)}px`);
  element.style.setProperty("--x", `${spawn.x.toFixed(2)}vw`);
  element.style.setProperty("--sway", `${sway.toFixed(1)}px`);
  element.style.setProperty("--duration", `${duration.toFixed(2)}s`);
  element.style.setProperty("--start-rotation", `${startRotation.toFixed(1)}deg`);
  element.style.setProperty("--end-rotation", `${endRotation.toFixed(1)}deg`);
  element.__rainData = { x: spawn.x, size, type, time: spawn.now };
  menuRainState.recentSpawns.push({ x: spawn.x, time: spawn.now });
  return true;
}

function syncMenuRain() {
  if (!dom.menuRain) return;
  const desiredCount = desiredMenuRainCount();

  while (menuRainState.shapes.length < desiredCount) {
    const element = createMenuShapeElement();
    menuRainState.seed += 1;
    menuRainState.shapes.push(element);
    dom.menuRain.appendChild(element);
  }

  while (menuRainState.shapes.length > desiredCount) {
    const inactiveIndex = menuRainState.shapes.findIndex((element) => !menuRainState.active.has(element));
    if (inactiveIndex < 0) break;
    const [element] = menuRainState.shapes.splice(inactiveIndex, 1);
    releaseMenuShape(element);
    element.remove();
  }
}

function spawnMenuRainShape() {
  if (!menuRainState.running || menuRainState.active.size >= desiredMenuRainCount()) return;
  syncMenuRain();
  const element = menuRainState.shapes.find((item) => !menuRainState.active.has(item));
  if (!element || !configureMenuShape(element)) return;

  menuRainState.active.add(element);
  void element.offsetWidth;
  element.classList.add("is-active");
}

function scheduleMenuRainSpawn(initial = false) {
  window.clearTimeout(menuRainState.spawnTimer);
  if (!menuRainState.running) return;
  const delay = initial ? randomRange(360, 720) : menuRainSpawnDelay();
  menuRainState.spawnTimer = window.setTimeout(() => {
    spawnMenuRainShape();
    scheduleMenuRainSpawn(false);
  }, delay);
}

function setMenuRainActive(active, reset = false) {
  if (!dom.menuRain) return;
  syncMenuRain();
  menuRainState.running = active;
  dom.menuRain.classList.toggle("is-running", active);

  if (!active) {
    clearMenuRain();
    return;
  }

  if (reset) clearMenuRain();
  scheduleMenuRainSpawn(true);
}

function updateHud(stats, wave) {
  dom.wave.textContent = `Волна ${wave}`;
  dom.time.textContent = formatTime(stats.survivalMs);
  dom.hpText.textContent = `${Math.ceil(stats.hp)} / ${stats.maxHp}`;
  dom.hpFill.style.transform = `scaleX(${clamp(stats.hp / stats.maxHp, 0, 1)})`;
  dom.level.textContent = `Level ${stats.level}`;
  dom.expText.textContent = `${formatExpValue(stats.exp)} / ${stats.nextExp}`;
  dom.expFill.style.transform = `scaleX(${clamp(stats.exp / stats.nextExp, 0, 1)})`;
}

function positionLevelToast() {
  const hudRect = dom.hud.getBoundingClientRect();
  const hudTop = runtime.settings?.hudPosition === "top";
  dom.levelToast.classList.toggle("toast-below-hud", hudTop);

  if (hudTop) {
    const top = hudRect.height > 0 && !dom.hud.classList.contains("hidden")
      ? hudRect.bottom + 10
      : 148;
    dom.levelToast.style.setProperty("--level-toast-top", `${Math.round(top)}px`);
    return;
  }

  const bottom = hudRect.height > 0 && !dom.hud.classList.contains("hidden")
    ? window.innerHeight - hudRect.top + 10
    : 148;
  dom.levelToast.style.setProperty("--level-toast-bottom", `${Math.round(bottom)}px`);
}

function resetLevelToast() {
  window.cancelAnimationFrame(showLevelToast.frame);
  window.clearTimeout(showLevelToast.timer);
  window.clearTimeout(showHudLevelPulse.timer);
  dom.levelToast.classList.remove("show");
  dom.levelToast.textContent = "LEVEL UP";
  dom.hud.classList.remove("level-pulse");
}

function showHudLevelPulse() {
  window.clearTimeout(showHudLevelPulse.timer);
  dom.hud.classList.remove("level-pulse");
  void dom.hud.offsetWidth;
  dom.hud.classList.add("level-pulse");
  showHudLevelPulse.timer = window.setTimeout(() => dom.hud.classList.remove("level-pulse"), 980);
}

function showLevelToast(levelsGained = 1) {
  window.cancelAnimationFrame(showLevelToast.frame);
  window.clearTimeout(showLevelToast.timer);
  dom.levelToast.classList.remove("show");
  positionLevelToast();
  dom.levelToast.textContent = levelsGained > 1 ? `LEVEL UP x${levelsGained}` : "LEVEL UP";
  void dom.levelToast.offsetWidth;
  showLevelToast.frame = window.requestAnimationFrame(() => {
    dom.levelToast.classList.add("show");
  });
  showLevelToast.timer = window.setTimeout(() => dom.levelToast.classList.remove("show"), 1160);
  showHudLevelPulse();
}

function showDamageFeedback() {
  dom.damageVignette.classList.add("show");
  window.clearTimeout(showDamageFeedback.timer);
  showDamageFeedback.timer = window.setTimeout(() => dom.damageVignette.classList.remove("show"), 130);
}

function showGameOver(summary) {
  resetLevelToast();
  hidePauseScreen();
  hideUpgradeScreen();
  setPauseButtonVisible(false);
  dom.statTime.textContent = summary.time;
  dom.statLevel.textContent = String(summary.level);
  dom.statWave.textContent = String(summary.wave);
  dom.statKills.textContent = String(summary.kills);
  dom.statExp.textContent = String(summary.exp);
  prepareNicknamePanel(summary);
  syncNicknamePanelPosition();
  setNicknamePanelActive(true);
  dom.hud.classList.add("hidden");
  transitionTo(() => {
    dom.gameOver.classList.add("screen-active");
  });
}

function transitionTo(callback) {
  dom.fadeLayer.classList.add("show");
  window.setTimeout(() => {
    callback();
    dom.fadeLayer.classList.remove("show");
  }, 185);
}

function hideScreens() {
  dom.menu.classList.remove("screen-active");
  dom.gameOver.classList.remove("screen-active");
  dom.pauseScreen.classList.remove("screen-active");
  dom.upgradeScreen.classList.remove("screen-active");
  setNicknamePanelActive(false);
  hideSettingsPanel();
  hideLeaderboardPanel();
}

function showPauseScreen() {
  dom.pauseScreen.classList.add("screen-active");
}

function hidePauseScreen() {
  dom.pauseScreen.classList.remove("screen-active");
}

function showUpgradeScreen(choices) {
  hidePauseScreen();
  dom.upgradeOptions.innerHTML = "";
  choices.forEach((choice, index) => {
    const button = document.createElement("button");
    const styleId = choice.styleId || choice.id.split("-")[0];
    button.className = `upgrade-option upgrade-option-${styleId}`;
    button.type = "button";
    button.innerHTML = `
      <span class="upgrade-badge">${choice.badge}</span>
      <span class="upgrade-title">${choice.title}</span>
      <span class="upgrade-description">${choice.description}</span>
    `;
    button.addEventListener("click", () => runtime.scene?.chooseUpgrade(index));
    dom.upgradeOptions.appendChild(button);
  });
  dom.upgradeScreen.classList.add("screen-active");
}

function hideUpgradeScreen() {
  dom.upgradeScreen.classList.remove("screen-active");
  dom.upgradeOptions.innerHTML = "";
}

function showSettingsPanel() {
  if (runtime.mode !== "menu") return;
  if (isMobileViewport()) hideLeaderboardPanel();
  syncSettingsPanelHeight();
  dom.menu.classList.add("settings-open");
  dom.settingsPanel.classList.add("open");
  dom.settingsPanel.setAttribute("aria-hidden", "false");
}

function hideSettingsPanel() {
  dom.menu.classList.remove("settings-open");
  dom.settingsPanel.classList.remove("open");
  dom.settingsPanel.setAttribute("aria-hidden", "true");
}

function toggleSettingsPanel() {
  if (runtime.mode !== "menu") return;
  if (dom.settingsPanel.classList.contains("open")) hideSettingsPanel();
  else showSettingsPanel();
}

function setLeaderboardCategoryMenuOpen(open) {
  dom.leaderboardCategoryMenu?.classList.toggle("open", open);
  dom.leaderboardCategoryMenu?.setAttribute("aria-hidden", open ? "false" : "true");
  dom.leaderboardCategoryButton?.setAttribute("aria-expanded", open ? "true" : "false");
}

function formatLeaderboardValue(category, value) {
  return leaderboards?.formatValue(category, value) || String(value ?? "—");
}

function setLeaderboardAnimation(element, index = 0) {
  element.classList.remove("leaderboard-animate-in");
  element.style.setProperty("--leaderboard-delay", `${Math.min(index * 42, 462)}ms`);
  void element.offsetWidth;
  element.classList.add("leaderboard-animate-in");
}

function renderLeaderboardRows(category, rows, playerRank) {
  if (!dom.leaderboardList) return;
  dom.leaderboardList.innerHTML = "";
  const normalizedRows = Array.isArray(rows) ? rows.slice(0, 10) : [];
  for (let i = 0; i < 10; i += 1) {
    const row = normalizedRows[i];
    const element = document.createElement("div");
    element.className = `leaderboard-row${row ? "" : " is-empty"}`;
    const place = document.createElement("span");
    const name = document.createElement("span");
    const value = document.createElement("span");
    place.textContent = `${i + 1}.`;
    name.textContent = row?.player_name || "—";
    value.textContent = row ? formatLeaderboardValue(category, row.value) : "—";
    element.append(place, name, value);
    setLeaderboardAnimation(element, i);
    dom.leaderboardList.appendChild(element);
  }
  dom.leaderboardPlayerRank.innerHTML = "";
  const rank = playerRank?.rank_position || playerRank?.place || null;
  if (playerRank && Number(rank) > 10) {
    const place = document.createElement("span");
    const name = document.createElement("span");
    const value = document.createElement("span");
    place.textContent = `${rank}.`;
    name.textContent = playerRank.player_name || "Ты";
    value.textContent = formatLeaderboardValue(category, playerRank.value);
    dom.leaderboardPlayerRank.append(place, name, value);
    dom.leaderboardPlayerRank.classList.add("show");
    setLeaderboardAnimation(dom.leaderboardPlayerRank, 10);
  } else {
    dom.leaderboardPlayerRank.classList.remove("show");
  }
  syncSettingsPanelHeight();
}

function renderLeaderboardMessage(message) {
  if (!dom.leaderboardList) return;
  dom.leaderboardList.innerHTML = "";
  const element = document.createElement("div");
  element.className = "leaderboard-message";
  element.textContent = message;
  setLeaderboardAnimation(element, 0);
  dom.leaderboardList.appendChild(element);
  dom.leaderboardPlayerRank.innerHTML = "";
  dom.leaderboardPlayerRank.classList.remove("show");
  syncSettingsPanelHeight();
}

async function loadLeaderboard(category = runtime.leaderboardCategory, force = false) {
  const service = leaderboards;
  const requestId = runtime.leaderboardRequestId + 1;
  runtime.leaderboardRequestId = requestId;
  if (!service) {
    renderLeaderboardMessage("Не удалось загрузить лидерборд");
    return;
  }
  runtime.leaderboardCategory = service.labels[category] ? category : "score";
  dom.leaderboardCategoryLabel.textContent = service.labels[runtime.leaderboardCategory];
  dom.leaderboardCategoryMenu?.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === runtime.leaderboardCategory);
  });
  renderLeaderboardMessage("Загрузка...");
  try {
    const data = await service.loadCategory(runtime.leaderboardCategory, force);
    if (requestId !== runtime.leaderboardRequestId) return;
    renderLeaderboardRows(runtime.leaderboardCategory, data.top, data.playerRank);
  } catch (error) {
    if (requestId !== runtime.leaderboardRequestId) return;
    renderLeaderboardMessage("Не удалось загрузить лидерборд");
  }
}

function showLeaderboardPanel() {
  if (runtime.mode !== "menu") return;
  if (isMobileViewport()) hideSettingsPanel();
  syncSettingsPanelHeight();
  dom.menu.classList.add("leaderboard-open");
  dom.leaderboardPanel.classList.add("open");
  dom.leaderboardPanel.setAttribute("aria-hidden", "false");
  loadLeaderboard(runtime.leaderboardCategory);
}

function hideLeaderboardPanel() {
  dom.menu.classList.remove("leaderboard-open");
  dom.leaderboardPanel?.classList.remove("open");
  dom.leaderboardPanel?.setAttribute("aria-hidden", "true");
  setLeaderboardCategoryMenuOpen(false);
}

function toggleLeaderboardPanel() {
  if (runtime.mode !== "menu") return;
  if (dom.leaderboardPanel.classList.contains("open")) hideLeaderboardPanel();
  else showLeaderboardPanel();
}

function updateNicknameButton() {
  const service = leaderboards;
  if (!service || !dom.nicknameInput || !dom.nicknameSaveButton) return;
  const value = service.normalizePlayerName(dom.nicknameInput.value);
  const saved = service.getSavedPlayerName();
  dom.nicknameSaveButton.disabled = !service.isValidPlayerName(value) || value === saved;
}

function setNicknameTaken(active) {
  if (!dom.nicknamePanel || !dom.nicknameInput) return;
  const message = active ? "Ник занят" : "";
  dom.nicknamePanel.toggleAttribute("data-status", Boolean(message));
  if (message) dom.nicknamePanel.setAttribute("data-status", message);
  dom.nicknameInput.classList.toggle("is-error", active);
}

function setNicknameSubmitError(error) {
  if (!dom.nicknamePanel || !dom.nicknameInput) return;
  const messages = {
    nickname_taken: "Ник занят",
    nickname_invalid: "Ник 3-16 символов",
    auth_failed: "Ошибка авторизации",
    submit_failed: "Ошибка отправки",
    leaderboard_unavailable: "Лидерборд недоступен",
  };
  if (error === "run_rejected") messages[error] = "Р РµР·СѓР»СЊС‚Р°С‚ РѕС‚РєР»РѕРЅРµРЅ";
  if (error === "submit_cooldown") messages[error] = "РџРѕРІС‚РѕСЂРё С‡РµСЂРµР· 15 СЃРµРє.";
  const message = messages[error] || "";
  dom.nicknamePanel.toggleAttribute("data-status", Boolean(message));
  if (message) dom.nicknamePanel.setAttribute("data-status", message);
  dom.nicknameInput.classList.toggle("is-error", Boolean(message));
}

function sanitizeNicknameInput() {
  const service = leaderboards;
  if (!service || !dom.nicknameInput) return;
  const sanitized = service.sanitizePlayerName
    ? service.sanitizePlayerName(dom.nicknameInput.value)
    : service.normalizePlayerName(dom.nicknameInput.value);
  if (dom.nicknameInput.value !== sanitized) dom.nicknameInput.value = sanitized;
  setNicknameTaken(false);
}

function prepareNicknamePanel(summary) {
  const service = leaderboards;
  if (!service) return;
  const savedName = service.getSavedPlayerName();
  if (dom.nicknameInput) dom.nicknameInput.value = service.sanitizePlayerName ? service.sanitizePlayerName(savedName) : savedName;
  runtime.pendingLeaderboardRun = {
    summary,
    runId: runtime.leaderboardRun?.runId || "",
    tracking: runtime.leaderboardRun || null,
    submitted: false,
    submitting: false,
  };
  updateNicknameButton();
}

function currentNicknameForSubmit() {
  const service = leaderboards;
  if (!service) return "";
  sanitizeNicknameInput();
  const typed = service.normalizePlayerName(dom.nicknameInput?.value || "");
  if (!service.isValidPlayerName(typed)) return "";
  const saved = service.savePlayerName(typed);
  if (dom.nicknameInput && saved) dom.nicknameInput.value = saved;
  updateNicknameButton();
  return saved;
}

function submitPendingLeaderboardRun() {
  const service = leaderboards;
  const pending = runtime.pendingLeaderboardRun;
  if (!service || !pending || pending.submitted || pending.submitting) return "skipped";
  const name = currentNicknameForSubmit();
  if (!name) {
    pending.submitted = true;
    runtime.pendingLeaderboardRun = null;
    return "skipped";
  }
  const summary = {
    ...pending.summary,
    build: pending.summary?.build
      ? {
          skills: { ...(pending.summary.build.skills || {}) },
          aidKits: pending.summary.build.aidKits || 0,
        }
      : null,
  };
  const initialRunId = pending.runId || pending.tracking?.runId || "";
  const runIdPromise = initialRunId
    ? Promise.resolve(initialRunId)
    : pending.tracking?.promise
      ? pending.tracking.promise.then((runId) => runId || pending.tracking?.runId || "")
      : Promise.resolve("");
  pending.submitting = true;
  pending.submitted = true;
  runtime.pendingLeaderboardRun = null;
  runIdPromise
    .then((runId) => {
      if (!service.canSubmitRun(summary, name, runId)) return false;
      return service.submitRun(summary, name, runId);
    })
    .then((submitted) => {
      pending.submitting = false;
      if (submitted && dom.leaderboardPanel?.classList.contains("open")) loadLeaderboard(runtime.leaderboardCategory, true);
    })
    .catch(() => {
      pending.submitting = false;
    });
  return "started";
}

function saveNicknameFromInput() {
  const service = leaderboards;
  if (!service || !dom.nicknameInput) return;
  sanitizeNicknameInput();
  const saved = service.savePlayerName(dom.nicknameInput.value);
  if (saved) {
    dom.nicknameInput.value = saved;
    updateNicknameButton();
  }
}

function setPauseButtonVisible(visible) {
  dom.pauseButton.classList.toggle("hidden", !visible);
  dom.musicButton?.classList.toggle("hidden", !visible);
  updateMusicButton();
}
