"use strict";

const leaderboards = (() => {
  const PROJECT_URL = "https://hbojcmkohqxwirysdalg.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_stgEvQyS4pIa85D6Qei08A_wui0kw7v";
  const PLAYER_NAME_KEY = "timeKillerPlayerName";
  const CACHE_MS = 60000;
  const CATEGORY_LABELS = {
    score: "Очки",
    time: "Время",
    kills: "Убийства",
  };
  const ABILITY_MAX_LEVELS = {
    razer: 3,
    shooter: 3,
    bazooka: 3,
    arrow: 3,
    masochism: 3,
    bloody: 3,
    knockback: 2,
    energyDrink: 3,
    thor: 3,
  };
  const state = {
    client: null,
    sessionPromise: null,
    cache: new Map(),
    submitError: "",
    checkpointInFlight: false,
  };

  function createClient() {
    if (state.client) return state.client;
    if (!window.supabase?.createClient) return null;
    state.client = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    return state.client;
  }

  async function ensureSession() {
    const client = createClient();
    if (!client?.auth) return null;
    if (state.sessionPromise) return state.sessionPromise;
    state.sessionPromise = (async () => {
      try {
        const current = await client.auth.getSession();
        if (current.data?.session) return current.data.session;
        const anonymous = await client.auth.signInAnonymously();
        if (anonymous.error) return null;
        return anonymous.data?.session || null;
      } catch (error) {
        return null;
      } finally {
        state.sessionPromise = null;
      }
    })();
    return state.sessionPromise;
  }

  function normalizePlayerName(value) {
    return String(value || "").trim();
  }

  function sanitizePlayerName(value) {
    return normalizePlayerName(value).replace(/[^A-Za-zА-Яа-яЁё0-9_-]/gu, "").slice(0, 16);
  }

  function isValidPlayerName(value) {
    const name = normalizePlayerName(value);
    return /^[A-Za-zА-Яа-яЁё0-9_-]{3,16}$/u.test(name);
  }

  function getSavedPlayerName() {
    try {
      const value = window.localStorage?.getItem(PLAYER_NAME_KEY) || "";
      return isValidPlayerName(value) ? normalizePlayerName(value) : "";
    } catch (error) {
      return "";
    }
  }

  function savePlayerName(value) {
    const name = normalizePlayerName(value);
    if (!isValidPlayerName(name)) return "";
    try {
      window.localStorage?.setItem(PLAYER_NAME_KEY, name);
    } catch (error) {}
    return name;
  }

  function roundNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : NaN;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function normalizeBuild(value) {
    const source = value && typeof value === "object" ? value : {};
    const rawSkills = source.skills && typeof source.skills === "object" ? source.skills : {};
    const skills = {};
    Object.keys(rawSkills).forEach((id) => {
      const maxLevel = ABILITY_MAX_LEVELS[id];
      const level = roundNumber(rawSkills[id]);
      if (!maxLevel || !Number.isFinite(level) || level <= 0) return;
      skills[id] = Math.min(maxLevel, level);
    });
    const rawAidKits = roundNumber(source.aidKits || 0);
    const aidKits = Number.isFinite(rawAidKits) ? Math.max(0, Math.min(99, rawAidKits)) : 0;
    return { skills, aidKits };
  }

  function buildUpgradeCount(build) {
    const skills = build?.skills || {};
    return Object.keys(skills).reduce((sum, id) => sum + Math.max(0, roundNumber(skills[id])), 0) + Math.max(0, roundNumber(build?.aidKits || 0));
  }

  function buildMetricsPayload(summary, runId) {
    const build = normalizeBuild(summary?.build);
    const payload = {
      runId: String(runId || summary?.runId || ""),
      score: roundNumber(summary?.score),
      survivalTime: roundNumber(summary?.survivalTime),
      kills: roundNumber(summary?.kills),
      wave: roundNumber(summary?.wave),
      level: roundNumber(summary?.level),
      exp: roundNumber(summary?.expValue ?? summary?.exp),
      deviceType: summary?.deviceType === "mobile" ? "mobile" : "desktop",
      build,
    };
    if (!isUuid(payload.runId)) return null;
    if (payload.score < 0 || payload.score > 50000) return null;
    if (payload.survivalTime < 10 || payload.survivalTime > 3600) return null;
    if (payload.kills < 0 || payload.kills > 100000) return null;
    if (payload.wave < 1 || payload.wave > 1000) return null;
    if (payload.level < 1 || payload.level > 100) return null;
    if (payload.exp < 0 || payload.exp > 50000) return null;
    if (!Number.isFinite(payload.score + payload.survivalTime + payload.kills + payload.wave + payload.level + payload.exp)) return null;
    if (payload.wave > Math.floor(payload.survivalTime / 10) + 5) return null;
    if (payload.kills > payload.survivalTime * 6.5 + 160) return null;
    if (payload.exp > payload.survivalTime * 70 + 1000) return null;
    if (payload.level > Math.floor(payload.survivalTime / 12) + 8) return null;
    if (buildUpgradeCount(build) > Math.floor(payload.level / 3) + 2) return null;
    const maxScore = Math.min(50000, payload.survivalTime * 75 + 1000);
    if (payload.score > maxScore || Math.abs(payload.score - payload.exp) > 5) return null;
    return payload;
  }

  function buildRunPayload(summary, playerName, runId) {
    const name = normalizePlayerName(playerName);
    const payload = buildMetricsPayload(summary, runId);
    if (!payload || !isValidPlayerName(name)) return null;
    payload.playerName = name;
    return payload;
  }

  function buildCheckpointPayload(summary, runId) {
    return buildMetricsPayload(summary, runId);
  }

  function canSubmitRun(summary, playerName, runId) {
    return Boolean(buildRunPayload(summary, playerName, runId));
  }

  async function startRun() {
    state.submitError = "";
    const session = await ensureSession();
    const client = createClient();
    if (!client) {
      state.submitError = "leaderboard_unavailable";
      return "";
    }
    if (!session) {
      state.submitError = "auth_failed";
      return "";
    }
    try {
      const result = await client.rpc("start_leaderboard_run");
      if (result.error) {
        state.submitError = parseSubmitError(result.error);
        return "";
      }
      return isUuid(result.data) ? result.data : "";
    } catch (error) {
      state.submitError = parseSubmitError(error);
      return "";
    }
  }

  async function submitRun(summary, playerName, runId) {
    const payload = buildRunPayload(summary, playerName, runId);
    if (!payload) return false;
    state.submitError = "";
    const session = await ensureSession();
    const client = createClient();
    if (!client) {
      state.submitError = "leaderboard_unavailable";
      return false;
    }
    if (!session) {
      state.submitError = "auth_failed";
      return false;
    }
    try {
      const result = await client.rpc("submit_leaderboard_run", {
        p_run_id: payload.runId,
        p_player_name: payload.playerName,
        p_score: payload.score,
        p_survival_time: payload.survivalTime,
        p_kills: payload.kills,
        p_wave: payload.wave,
        p_level: payload.level,
        p_exp: payload.exp,
        p_device_type: payload.deviceType,
        p_build: payload.build,
      });
      if (result.error) {
        state.submitError = parseSubmitError(result.error);
        return false;
      }
      if (result.data !== true) {
        state.submitError = "run_rejected";
        return false;
      }
      state.cache.clear();
      return true;
    } catch (error) {
      state.submitError = parseSubmitError(error);
      return false;
    }
  }

  async function submitCheckpoint(summary, runId) {
    if (state.checkpointInFlight) return false;
    const payload = buildCheckpointPayload(summary, runId);
    if (!payload) return false;
    const client = createClient();
    if (!client) return false;
    state.checkpointInFlight = true;
    try {
      await ensureSession();
      const result = await client.rpc("submit_leaderboard_checkpoint", {
        p_run_id: payload.runId,
        p_score: payload.score,
        p_survival_time: payload.survivalTime,
        p_kills: payload.kills,
        p_wave: payload.wave,
        p_level: payload.level,
        p_exp: payload.exp,
        p_build: payload.build,
      });
      return !result.error;
    } catch (error) {
      return false;
    } finally {
      state.checkpointInFlight = false;
    }
  }

  function parseSubmitError(error) {
    const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
    if (text.includes("nickname_taken")) return "nickname_taken";
    if (text.includes("invalid_player_name") || text.includes("value too long") || text.includes("character varying(8)") || text.includes("character varying(12)")) return "nickname_invalid";
    if (text.includes("auth_required")) return "auth_failed";
    if (text.includes("submit_cooldown") || text.includes("start_cooldown")) return "submit_cooldown";
    if (text.includes("run_not_active") || text.includes("run_already_submitted") || text.includes("invalid_run_id") || text.includes("run_rejected") || text.includes("invalid_elapsed_time") || text.includes("invalid_run_values") || text.includes("invalid_score")) return "run_rejected";
    return "submit_failed";
  }

  function getSubmitError() {
    return state.submitError;
  }

  function normalizeCategory(category) {
    return CATEGORY_LABELS[category] ? category : "score";
  }

  async function loadCategory(category, force = false) {
    const key = normalizeCategory(category);
    const cached = state.cache.get(key);
    const now = Date.now();
    if (!force && cached && now - cached.loadedAt < CACHE_MS) return cached.data;
    const client = createClient();
    if (!client) throw new Error("leaderboard_unavailable");
    await ensureSession();
    const topResult = await client.rpc("get_leaderboard_top", { p_category: key });
    if (topResult.error) throw topResult.error;
    let playerRank = null;
    try {
      const rankResult = await client.rpc("get_leaderboard_player_rank", { p_category: key });
      if (!rankResult.error) {
        playerRank = Array.isArray(rankResult.data) ? rankResult.data[0] || null : rankResult.data || null;
      }
    } catch (error) {
      playerRank = null;
    }
    const data = {
      top: Array.isArray(topResult.data) ? topResult.data : [],
      playerRank,
    };
    state.cache.set(key, { loadedAt: now, data });
    return data;
  }

  function formatValue(category, value) {
    const number = roundNumber(value);
    if (!Number.isFinite(number)) return "—";
    if (category === "time") {
      const minutes = Math.floor(number / 60);
      const seconds = number % 60;
      return `${minutes} м. ${seconds} с.`;
    }
    return String(number);
  }

  ensureSession();

  return Object.freeze({
    labels: CATEGORY_LABELS,
    loadCategory,
    startRun,
    submitRun,
    submitCheckpoint,
    canSubmitRun,
    getSubmitError,
    getSavedPlayerName,
    savePlayerName,
    normalizePlayerName,
    sanitizePlayerName,
    isValidPlayerName,
    formatValue,
  });
})();
