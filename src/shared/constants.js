/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/shared/constants.js
 *  Purpose : Single source of truth — OAuth config, API
 *            endpoints, quota cost table, hard limits.
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 *  Updated : 2026-09-20 (v0.1.0 — M0)
 * ───────────────────────────────────────────────────────
 *  HOW TO READ THIS FILE
 *   §1 — OAuth (client IDs + scopes)
 *   §2 — API endpoints & quota cost table
 *   §3 — YouTube hard limits (title/tags/thumbnail)
 *   §4 — Storage key namespaces
 *  NOTE: quota numbers verified 2026-09-20 — re-check GCP
 *        Console before each release (plan §৭).
 * ═══════════════════════════════════════════════════════
 */

// ── §1: OAUTH ──────────────────────────────────────────
export const OAUTH = {
  // Chrome client (user-provided ✅). Firefox/Android client: TODO(M1) — plan §২১.
  CLIENT_IDS: {
    chrome: "793269026723-dqr2nur16bo0oossr15d0elq6m5v86ve.apps.googleusercontent.com",
    firefox: "", // paste here after creating the Firefox-type client in GCP Console
  },
  SCOPES: [
    "https://www.googleapis.com/auth/youtube.readonly",      // videos.list, playlists.list
    "https://www.googleapis.com/auth/youtube.upload",        // videos.insert (upload queue)
    "https://www.googleapis.com/auth/youtube.force-ssl",     // videos.update / delete / thumbnails.set
    "https://www.googleapis.com/auth/yt-analytics.readonly",         // Analytics: views, watch time, CTR
    "https://www.googleapis.com/auth/yt-analytics-monetary.readonly", // Revenue/RPM card (YPP channels, §৯.৭)
  ],
  AUTH_URL: "https://accounts.google.com/o/oauth2/v2/auth",
  REVOKE_URL: "https://oauth2.googleapis.com/revoke",
  TOKEN_URL: "https://oauth2.googleapis.com/token",
};

// ── §2: API ENDPOINTS + QUOTA COSTS ────────────────────
export const API = {
  BASE: "https://www.googleapis.com/youtube/v3",
  UPLOAD_BASE: "https://www.googleapis.com/upload/youtube/v3",
  ANALYTICS: "https://youtubeanalytics.googleapis.com/v2",
};

export const QUOTA_COST = {
  VIDEOS_LIST: 1,
  VIDEOS_UPDATE: 50,       // title + description + tags = ONE merged call
  THUMBNAILS_SET: 50,
  VIDEOS_INSERT: 1600,     // ⚠️ one upload ≈ 32 renames
  VIDEOS_DELETE: 50,
  ANALYTICS_QUERY: 1,      // separate quota pool (different API)
  PLAYLISTS_LIST: 1,
  CHANNELS_LIST: 1,
};

export const QUOTA = {
  DAILY_LIMIT: 10000,      // per GCP project; resets midnight Pacific
  WARN_AT_PERCENT: 70,
  UPLOAD_CHUNK_BYTES: 5 * 1024 * 1024, // 5 MB resumable chunks
};

// ── §3: YOUTUBE HARD LIMITS ────────────────────────────
export const LIMITS = {
  TITLE_MAX: 100,
  TAGS_TOTAL_MAX: 500,     // all tags combined, characters
  THUMB_MAX_BYTES: 2 * 1024 * 1024,
  THUMB_TYPES: ["image/jpeg", "image/png", "image/gif", "image/bmp"],
  SHORT_MAX_SECONDS: 60,   // kind detection heuristic (plan §৮)
  CONCURRENCY: 4,          // parallel items per batch
  PAGE_SIZE: 50,           // videos.list maxResults
};

// ── §4: STORAGE KEYS (all prefixed, plan §৮) ───────────
export const KEYS = (channelId) => ({
  videos: `yt.videos.${channelId}`,
  history: `yt.history.${channelId}`,
  quota: `yt.quota.${channelId}`,
  analytics: `yt.analytics.cache.${channelId}`,
});
export const GLOBAL_KEYS = {
  accounts: "yt.accounts",
  activeAccount: "yt.activeAccount",
  templates: "yt.templates",
  settings: "yt.settings",
  activeJob: "yt.activeJob",
  uploadQueue: "yt.uploadQueue",
};

export const COPYRIGHT = "© 2026 Tasneem Bin Ahsan (TBA) · github.com/tbahsan";
