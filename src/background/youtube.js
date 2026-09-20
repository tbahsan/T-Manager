/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/background/youtube.js
 *  Purpose : The ONLY module that talks to YouTube Data API.
 *            Wraps auth + quota recording + backoff so callers
 *            (batch-runner, upload) stay clean.
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 *  Updated : 2026-09-20 (v0.1.0 — M0 skeleton)
 * ───────────────────────────────────────────────────────
 *  HOW TO READ THIS FILE
 *   §1 — api(): single fetch choke-point (auth, quota log, backoff)
 *   §2 — Read endpoints (list videos, playlists, channel)
 *   §3 — Write endpoints (update/delete/thumbnail)  [M3–M5]
 * ═══════════════════════════════════════════════════════
 */
import { API, QUOTA_COST, LIMITS } from "../shared/constants.js";
import { getAccessToken } from "./oauth.js";
import { recordCost } from "./quota.js";

// ── §1: One fetch choke-point ──────────────────────────
/**
 * Authenticated GET/POST to the Data API with:
 *  - automatic Bearer token
 *  - usage ledger update (every call costs units → we log them)
 *  - 429/403 backoff: 2s → 4s → 8s, then give up (job pauses, plan §১৪)
 */
export async function api(path, { method = "GET", body, query, base = API.BASE, cost = QUOTA_COST.VIDEOS_LIST, channelId, retries = 3 } = {}) {
  const url = new URL(base + path);
  Object.entries(query ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));

  for (let attempt = 0; ; attempt++) {
    const token = await getAccessToken();
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) {
      if (channelId) await recordCost(channelId, cost);
      return res.json();
    }
    const retryable = res.status === 429 || res.status === 403; // 403 often = quotaExceeded
    if (!retryable || attempt >= retries) throw await toApiError(res);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt)); // 2s, 4s, 8s
  }
}

async function toApiError(res) {
  let reason = String(res.status);
  try {
    reason = (await res.json())?.error?.errors?.[0]?.reason ?? reason;
  } catch { /* non-JSON error body */ }
  return Object.assign(new Error(`YouTube API ${res.status} (${reason})`), { code: reason, status: res.status });
}

// ── §2: Reads ──────────────────────────────────────────
/** Channel card (title, avatar, video count) for the dashboard header. */
export async function getMyChannel() {
  const data = await api("/channels", { query: { part: "snippet,contentDetails,statistics", mine: "true" } });
  return data.items?.[0] ?? null;
}

/**
 * All owned videos, paginated via uploads-playlist pages.
 * kind detection: duration ≤ 60s → "short" (heuristic refined in M2, plan §৮).
 * @returns {AsyncGenerator<object>} each yielded item = cached video record
 */
export async function* listAllVideos(playlistId) {
  let pageToken;
  do {
    const page = await api("/playlistItems", {
      query: { part: "contentDetails", playlistId, maxResults: LIMITS.PAGE_SIZE, ...(pageToken ? { pageToken } : {}) },
    });
    pageToken = page.nextPageToken;
    const ids = page.items.map((i) => i.contentDetails.videoId);
    if (!ids.length) continue;
    const details = await api("/videos", { query: { part: "snippet,contentDetails,statistics", id: ids.join(",") } });
    for (const v of details.items ?? []) yield normalizeVideo(v);
  } while (pageToken);
}

function normalizeVideo(v) {
  return {
    id: v.id,
    title: v.snippet.title,
    description: v.snippet.description,
    tags: v.snippet.tags ?? [],
    categoryId: v.snippet.categoryId ?? "22",
    publishedAt: v.snippet.publishedAt,
    durationSec: iso8601ToSeconds(v.contentDetails.duration),
    thumbnailUrl: v.snippet.thumbnails?.medium?.url,
    kind: iso8601ToSeconds(v.contentDetails.duration) <= LIMITS.SHORT_MAX_SECONDS ? "short" : "long",
  };
}

/** "PT4M13S" → 253 */
function iso8601ToSeconds(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? "PT0S");
  return (+(m?.[1] ?? 0)) * 3600 + (+(m?.[2] ?? 0)) * 60 + (+(m?.[3] ?? 0));
}

// ── §3: Writes (M3–M5 implementations mount here) ─────
/** One merged videos.update: title + description + tags together = 50u. */
export async function updateVideoSnippet(channelId, { id, title, description, tags, categoryId }) {
  return api("/videos", {
    method: "PUT",
    query: { part: "snippet" },
    // categoryId MUST be sent back or YouTube errors — callers pass it from the cache.
    body: { id, snippet: { id, title, description, tags, categoryId } },
    cost: QUOTA_COST.VIDEOS_UPDATE,
    channelId,
  });
}

export async function setThumbnail(channelId, videoId, blob) {
  const token = await getAccessToken();
  const res = await fetch(`${API.UPLOAD_BASE}/thumbnails/set?videoId=${videoId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": blob.type },
    body: blob,
  });
  if (res.ok) {
    await recordCost(channelId, QUOTA_COST.THUMBNAILS_SET);
    return res.json();
  }
  throw await toApiError(res);
}

export async function deleteVideo(channelId, videoId) {
  return api("/videos", { method: "DELETE", query: { id: videoId }, cost: QUOTA_COST.VIDEOS_DELETE, channelId });
}
