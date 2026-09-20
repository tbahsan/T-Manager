/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/shared/quota-model.js
 *  Purpose : Pure cost-estimation math — powers the
 *            "⚠️ this batch will cost X units" preview and the
 *            upload hard gate. No browser APIs (testable).
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 *  Updated : 2026-09-20 (v0.1.0 — M0)
 * ───────────────────────────────────────────────────────
 *  HOW TO READ THIS FILE
 *   §1 — estimateBatchCost(): action(s) × video count
 *   §2 — canRunBatch(): gate vs remaining daily quota
 *  KEY FACT: rename+desc+tags merge into ONE videos.update
 *  call = 50u — NOT 150u (plan §৭).
 * ═══════════════════════════════════════════════════════
 */
import { QUOTA_COST, QUOTA } from "./constants.js";

// ── §1: Cost estimation ────────────────────────────────
/**
 * @param {{rename?: boolean, description?: boolean, tags?: boolean,
 *          thumbnails?: boolean, upload?: number, delete?: number,
 *          videoCount?: number}} plan
 *        videoCount applies to rename/description/tags/thumbnails
 *        (they share one merged videos.update → 50u total, not 150u).
 * @returns {{units: number, breakdown: Array<{method: string, count: number, units: number}>}}
 */
export function estimateBatchCost(plan) {
  const breakdown = [];
  let units = 0;

  const mergedWrites =
    Boolean(plan.rename || plan.description || plan.tags) * (plan.videoCount || 0);
  if (mergedWrites > 0) {
    const u = mergedWrites * QUOTA_COST.VIDEOS_UPDATE;
    breakdown.push({ method: "videos.update (merged)", count: mergedWrites, units: u });
    units += u;
  }
  if (plan.thumbnails) {
    const u = plan.videoCount * QUOTA_COST.THUMBNAILS_SET;
    breakdown.push({ method: "thumbnails.set", count: plan.videoCount, units: u });
    units += u;
  }
  if (plan.delete) {
    const u = plan.delete * QUOTA_COST.VIDEOS_DELETE;
    breakdown.push({ method: "videos.delete", count: plan.delete, units: u });
    units += u;
  }
  if (plan.upload) {
    const u = plan.upload * QUOTA_COST.VIDEOS_INSERT;
    breakdown.push({ method: "videos.insert", count: plan.upload, units: u });
    units += u;
  }
  return { units, breakdown };
}

// ── §2: Gate ───────────────────────────────────────────
/**
 * @param {{units: number, usedToday?: number, dailyLimit?: number}} g
 * @returns {{ok: boolean, remaining: number, reason?: string}}
 */
export function canRunBatch(g) {
  const used = g.usedToday ?? 0;
  const limit = g.dailyLimit ?? QUOTA.DAILY_LIMIT;
  const remaining = limit - used;
  if (g.units > remaining) {
    return {
      ok: false,
      remaining,
      reason: `Needs ${g.units}u but only ${remaining}u left today — shrink the batch or resume tomorrow (quota resets midnight Pacific).`,
    };
  }
  return { ok: true, remaining };
}
