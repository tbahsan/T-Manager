/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/background/quota.js
 *  Purpose : Daily usage ledger + cost preview. Local estimate
 *            only — YouTube exposes no "remaining quota" API
 *            (documented honestly in plan §৭ / docs/QUOTA.md).
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 *  Updated : 2026-09-20 (v0.1.0 — M0 skeleton)
 * ───────────────────────────────────────────────────────
 *  HOW TO READ THIS FILE
 *   §1 — Ledger shape + Pacific-midnight reset
 *   §2 — recordCost() / getUsage() — called around every API call
 * ═══════════════════════════════════════════════════════
 */
import { QUOTA } from "../shared/constants.js";
import { get, set } from "../shared/storage.js";

// ── §1: Ledger ─────────────────────────────────────────
// yt.quota.<channelId> = { date: "YYYY-MM-DD", used: 5234, history: [...] }
function todayPacific() {
  // Quota resets midnight PACIFIC — we must match Google's clock, not ours.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function ledger(channelId) {
  const key = `yt.quota.${channelId}`;
  const rec = (await get(key)) ?? { date: todayPacific(), used: 0 };
  if (rec.date !== todayPacific()) return { key, rec: { date: todayPacific(), used: 0 } };
  return { key, rec };
}

// ── §2: Public API ─────────────────────────────────────
/** Adds `units` to today's total (call AFTER each successful API call). */
export async function recordCost(channelId, units) {
  const { key, rec } = await ledger(channelId);
  rec.used += units;
  await set(key, rec);
  return rec.used;
}

/** {date, used, limit, percent, warn} for the dashboard bar + badge. */
export async function getUsage(channelId) {
  const { rec } = await ledger(channelId);
  const percent = Math.min(100, Math.round((rec.used / QUOTA.DAILY_LIMIT) * 100));
  return { date: rec.date, used: rec.used, limit: QUOTA.DAILY_LIMIT, percent, warn: percent >= QUOTA.WARN_AT_PERCENT };
}
