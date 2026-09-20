/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/background/history.js
 *  Purpose : Undo snapshots + batch history + restore.
 *            Snapshots come from the LOCAL CACHE → 0 quota.
 *            Restore re-writes prev values via videos.update
 *            (50u/video — the popup previews this cost first).
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  NOTE   : video DELETE has NO undo (plan §৯.৬) — snapshots
 *           for delete keep metadata only as a record.
 * ═══════════════════════════════════════════════════════
 */
import { get, update } from "../shared/storage.js";

const RETAIN_MAX = 50;
const key = (channelId) => `yt.history.${channelId}`;

/** Persist prev title/description/tags/categoryId per affected video. */
export async function snapshotBatch(channelId, { batchId, action, videos }) {
  const record = {
    batchId,
    action,
    at: new Date().toISOString(),
    videos: videos.map((v) => ({ id: v.id, title: v.title, prev: { title: v.title, description: v.description, tags: v.tags, categoryId: v.categoryId } })),
    status: "done",
    failureCount: 0,
  };
  return update(key(channelId), (list = []) => [record, ...list].slice(0, RETAIN_MAX));
}

export async function listHistory(channelId) {
  return get(key(channelId), []);
}

/**
 * Reverts an entire batch (or one video when videoId given).
 * @param {Function} updateSnippet async ({id, title, description, tags, categoryId}) → API call
 */
export async function undoBatch(channelId, batchId, updateSnippet, videoId = null) {
  const list = await get(key(channelId), []);
  const rec = list.find((r) => r.batchId === batchId);
  if (!rec) throw Object.assign(new Error("Batch not found"), { code: "NOT_FOUND" });

  const targets = videoId ? rec.videos.filter((v) => v.id === videoId) : rec.videos;
  const failures = [];
  for (const v of targets) {
    try {
      await updateSnippet({ id: v.id, ...v.prev });
    } catch (err) {
      failures.push({ id: v.id, reason: String(err.message ?? err) });
    }
  }
  rec.status = failures.length ? "partial-undo" : "undone";
  rec.failureCount = failures.length;
  await update(key(channelId), (l = []) => l.map((r) => (r.batchId === batchId ? rec : r)));
  return { batchId, undone: targets.length - failures.length, failures };
}
