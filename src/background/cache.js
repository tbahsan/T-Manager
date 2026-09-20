/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/background/cache.js
 *  Purpose : Per-channel video cache (yt.videos.<channelId>).
 *            ONE sync = a few videos.list pages (1u each) →
 *            every later read/preview/undo is FREE (plan §৩.2).
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 * ───────────────────────────────────────────────────────
 *   §1 — syncChannel(): full refresh via youtube.listAllVideos
 *   §2 — getRecords()/getRecord()/patchRecord()
 * ═══════════════════════════════════════════════════════
 */
import { get, set } from "../shared/storage.js";
import { listAllVideos, getMyChannel } from "./youtube.js";

const key = (channelId) => `yt.videos.${channelId}`;

// ── §1 ─────────────────────────────────────────────────
/** Fresh fetch of ALL owned videos + channel card. ~1u per 50 videos. */
export async function syncChannel(channelId) {
  const channel = await getMyChannel();
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;
  const records = [];
  if (uploadsPlaylistId) {
    for await (const v of listAllVideos(uploadsPlaylistId)) records.push(v);
  }
  await set(key(channelId), records);
  await set(`yt.channel.${channelId}`, { id: channel?.id ?? channelId, title: channel?.snippet?.title ?? "", thumbnail: channel?.snippet?.thumbnails?.default?.url ?? "", videoCount: records.length, syncedAt: new Date().toISOString() });
  return records;
}

// ── §2 ─────────────────────────────────────────────────
export async function getRecords(channelId, force = false) {
  const existing = await get(key(channelId));
  if (!existing || force) return syncChannel(channelId);
  return existing;
}

export async function getRecord(channelId, videoId) {
  return (await getRecords(channelId)).find((v) => v.id === videoId) ?? null;
}

/** Merge a patch into one cached record after a successful write. */
export async function patchRecord(channelId, videoId, patch) {
  const records = await get(key(channelId), []);
  const idx = records.findIndex((v) => v.id === videoId);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...patch };
    await set(key(channelId), records);
  }
  return records[idx];
}

export async function removeRecord(channelId, videoId) {
  const records = await get(key(channelId), []);
  await set(key(channelId), records.filter((v) => v.id !== videoId));
}

export async function getChannelCard(channelId) {
  return get(`yt.channel.${channelId}`, null);
}
