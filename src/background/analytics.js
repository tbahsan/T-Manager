/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/background/analytics.js
 *  Purpose : YouTube Analytics API v2 wrapper + 6h cache.
 *            Separate API = separate quota pool (~1u/query) —
 *            still logged so docs stay honest (plan §৭).
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 *  Updated : 2026-09-20 (v0.1.0 — M0 skeleton)
 *  NOTE: estimatedRevenue included (user-confirmed) — requires
 *        a monetized (YPP) channel; otherwise hidden in UI (§৯.৭).
 * ═══════════════════════════════════════════════════════
 */
import { API, QUOTA_COST } from "../shared/constants.js";
import { getAccessToken } from "./oauth.js";
import { recordCost } from "./quota.js";
import { get, set } from "../shared/storage.js";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Runs one reports.query with cache. Metrics default set includes
 * estimatedRevenue — YouTube simply omits it for non-monetized
 * channels (UI hides the card then).
 */
export async function queryReport(channelId, { metrics, dimensions = "", startDate, endDate, filters, sort, maxResults }) {
  const cacheKey = `yt.analytics.cache.${channelId}`;
  const cache = (await get(cacheKey)) ?? {};
  const sig = JSON.stringify({ metrics, dimensions, startDate, endDate, filters });
  if (cache[sig] && Date.now() - cache[sig].at < CACHE_TTL_MS) return cache[sig].data; // 0 units

  const token = await getAccessToken();
  const qs = new URLSearchParams({
    ids: `channel==${channelId}`,
    metrics,
    startDate,
    endDate,
    ...(dimensions ? { dimensions } : {}),
    ...(filters ? { filters } : {}),
    ...(sort ? { sort } : {}),
    ...(maxResults ? { maxResults: String(maxResults) } : {}),
  });
  const res = await fetch(`${API.ANALYTICS}/reports?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    // Surface Google's actual reason — "Analytics 400" alone is useless to the user.
    let detail = String(res.status);
    try { detail = (await res.json())?.error?.message ?? detail; } catch { /* non-JSON */ }
    throw Object.assign(new Error(`Analytics ${res.status}: ${detail}`), { code: "ANALYTICS_ERROR" });
  }
  const data = await res.json();
  await recordCost(channelId, QUOTA_COST.ANALYTICS_QUERY);
  cache[sig] = { at: Date.now(), data };
  await set(cacheKey, cache);
  return data;
}
