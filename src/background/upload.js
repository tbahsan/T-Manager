/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/background/upload.js
 *  Purpose : Resumable upload queue (videos.insert,
 *            uploadType=resumable). The POPUP owns the File
 *            handle and streams 5 MB chunks here as base64 —
 *            File/Blob objects cannot cross runtime.sendMessage.
 *            Session URL + nextByte persist in storage, so the
 *            queue survives SW restarts (plan §৯.৫/§১৪).
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 * ───────────────────────────────────────────────────────
 *   §1 — initUpload(): 1 POST → session URI (persisted)
 *   §2 — sendChunk(): base64 → bytes → PUT (308/201 protocol)
 *   §3 — queue helpers (state, cancel)
 *  QUOTA: 1,600u/video — the popup gates via quota-model BEFORE
 *  calling initUpload. Privacy + madeForKids come from the
 *  mandatory pre-flight step (user-confirmed decision, §২১).
 * ═══════════════════════════════════════════════════════
 */
import { API, QUOTA_COST } from "../shared/constants.js";
import { getAccessToken } from "./oauth.js";
import { recordCost } from "./quota.js";
import { get, set } from "../shared/storage.js";

const QKEY = "yt.uploadQueue";
const q = () => get(QKEY, []);
const saveQueue = (list) => set(QKEY, list);

// ── §1 ─────────────────────────────────────────────────
export async function initUpload(meta) {
  const token = await getAccessToken();
  const url = new URL(`${API.UPLOAD_BASE}/videos`);
  url.searchParams.set("uploadType", "resumable");
  url.searchParams.set("part", "snippet,status");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      snippet: { title: meta.title, description: meta.description ?? "", tags: meta.tags ?? [] },
      status: { privacyStatus: meta.privacy, selfDeclaredMadeForKids: meta.madeForKids },
    }),
  });
  if (!res.ok) throw Object.assign(new Error(`Upload session init failed: ${res.status}`), { code: "UPLOAD_INIT" });

  const item = {
    uploadId: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: meta.title,
    totalBytes: meta.totalBytes,
    uploadUrl: res.headers.get("location"),
    nextByte: 0,
    videoId: null,
    state: "UPLOADING",
    createdAt: new Date().toISOString(),
  };
  await saveQueue([...(await q()), item]);
  return item;
}

// ── §2 ─────────────────────────────────────────────────
/** base64 → bytes → one resumable PUT. Returns {done, nextByte, videoId}. */
export async function sendChunk(uploadId, dataB64) {
  const list = await q();
  const item = list.find((x) => x.uploadId === uploadId);
  if (!item) throw Object.assign(new Error("Unknown uploadId"), { code: "NOT_FOUND" });

  const bytes = Uint8Array.from(atob(dataB64), (c) => c.charCodeAt(0));
  const last = item.nextByte + bytes.length - 1;
  const token = await getAccessToken();
  const res = await fetch(item.uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Length": String(bytes.length),
      "Content-Range": `bytes ${item.nextByte}-${last}/${item.totalBytes}`,
    },
    body: bytes,
  });

  if (res.status === 308) {
    item.nextByte = last + 1;
    await saveQueue(list.map((x) => (x.uploadId === uploadId ? item : x)));
    return { done: false, nextByte: item.nextByte, videoId: null };
  }
  if (res.status === 201) {
    const body = await res.json();
    item.videoId = body.id;
    item.state = "DONE";
    item.nextByte = item.totalBytes;
    await saveQueue(list.map((x) => (x.uploadId === uploadId ? item : x)));
    await recordCost(body.snippet?.channelId ?? "", QUOTA_COST.VIDEOS_INSERT);
    return { done: true, nextByte: item.totalBytes, videoId: body.id };
  }
  item.state = "ERROR";
  await saveQueue(list.map((x) => (x.uploadId === uploadId ? item : x)));
  throw Object.assign(new Error(`Chunk failed: ${res.status}`), { code: "UPLOAD_CHUNK" });
}

// ── §3 ─────────────────────────────────────────────────
export async function uploadState() {
  return q();
}
export async function cancelUpload(uploadId) {
  await saveQueue((await q()).filter((x) => x.uploadId !== uploadId));
}
