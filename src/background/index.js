/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/background/index.js
 *  Purpose : Entry point — THE message router (popup ⇄ bg).
 *            Every handler returns a Promise; results normalize
 *            to {ok:true,data}|{ok:false,error:{code,message}}.
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 * ───────────────────────────────────────────────────────
 *  HOW TO READ THIS FILE
 *   §1 — MSG type constants (protocol v1, plan §৩)
 *   §2 — Batch dispatch (rename/desc/tags/thumbs/delete share
 *        one pipeline: snapshot → createJob → runBatch)
 *   §3 — Handler table
 *   §4 — MV3 lifecycle (resume on wake)
 *  RULE: popup never calls YouTube. Every write flows through
 *  here so quota logging + undo snapshots can't be skipped.
 * ═══════════════════════════════════════════════════════
 */
import browser from "webextension-polyfill";
import * as oauth from "./oauth.js";
import * as cache from "./cache.js";
import * as quota from "./quota.js";
import * as history from "./history.js";
import * as upload from "./upload.js";
import * as analytics from "./analytics.js";
import { createJob, runBatch, pauseJob, cancelJob, resumeJob, getJob, resumeInterrupted, notifyPopup } from "./batch-runner.js";
import { updateVideoSnippet, deleteVideo, setThumbnail } from "./youtube.js";
import { getSettings } from "../shared/settings.js";

// ── §1: Protocol ───────────────────────────────────────
export const MSG = {
  PING: "PING", AUTH_LOGIN: "AUTH_LOGIN", AUTH_LOGOUT: "AUTH_LOGOUT", AUTH_STATE: "AUTH_STATE",
  ACCOUNT_SWITCH: "ACCOUNT_SWITCH", LIST_VIDEOS: "LIST_VIDEOS", GET_QUOTA: "GET_QUOTA",
  RUN_BATCH: "RUN_BATCH", PAUSE_JOB: "PAUSE_JOB", RESUME_JOB: "RESUME_JOB", CANCEL_JOB: "CANCEL_JOB",
  JOB_STATE: "JOB_STATE", UNDO_BATCH: "UNDO_BATCH", HISTORY_LIST: "HISTORY_LIST",
  TEMPLATES_GET: "TEMPLATES_GET", TEMPLATES_SAVE: "TEMPLATES_SAVE", TEMPLATES_DELETE: "TEMPLATES_DELETE",
  UPLOAD_INIT: "UPLOAD_INIT", UPLOAD_CHUNK: "UPLOAD_CHUNK", UPLOAD_STATE: "UPLOAD_STATE", UPLOAD_CANCEL: "UPLOAD_CANCEL",
  ANALYTICS_QUERY: "ANALYTICS_QUERY", SETTINGS_GET: "SETTINGS_GET", SETTINGS_SAVE: "SETTINGS_SAVE",
};

// ── §2: Batch dispatch ─────────────────────────────────
let batchIdSeq = 0;

/** dataURL → Blob (thumbnails travel base64 through sendMessage). */
function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(",");
  const type = head.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  return new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type });
}

/** One applyItem per action — injected into batchRunner.runBatch. */
function makeApplyItem(action, channelId, recordsById) {
  switch (action) {
    case "rename":
    case "description":
    case "tags":
    case "metadata": // rename+desc+tags merged (one 50u call)
      return async ({ id, patch }) => {
        const rec = recordsById.get(id);
        await updateVideoSnippet(channelId, {
          id,
          title: patch.title ?? rec.title,
          description: patch.description ?? rec.description,
          tags: patch.tags ?? rec.tags,
          categoryId: rec.categoryId,
        });
        await cache.patchRecord(channelId, id, patch);
      };
    case "thumbnails":
      return async ({ id, patch }) => {
        await setThumbnail(channelId, id, dataUrlToBlob(patch.dataUrl));
        await cache.patchRecord(channelId, id, { thumbnailUrl: patch.dataUrl });
      };
    case "delete": // ⚠️ NO undo — triple-guarded in the popup (§৯.৬)
      return async ({ id }) => {
        await deleteVideo(channelId, id);
        await cache.removeRecord(channelId, id);
      };
    default:
      throw Object.assign(new Error(`Unknown action: ${action}`), { code: "BAD_ACTION" });
  }
}

async function handleRunBatch({ action, items, costPreview }) {
  const ctx = await oauth.getApplicationContext();
  const records = await cache.getRecords(ctx.channelId);
  const recordsById = new Map(records.map((r) => [r.id, r]));

  // INVARIANT (plan §১০.5): snapshot BEFORE the job exists.
  const batchId = `b-${Date.now()}-${(batchIdSeq++).toString(36)}`;
  await history.snapshotBatch(ctx.channelId, {
    batchId,
    action,
    videos: items.map(({ id }) => recordsById.get(id)).filter(Boolean),
  });

  await createJob({ batchId, channelId: ctx.channelId, action, items, costPreview });
  return runBatch({ applyItem: makeApplyItem(action, ctx.channelId, recordsById) });
}

// ── §3: Handler table ──────────────────────────────────
const handlers = {
  [MSG.PING]: () => ({ pong: true, by: "T-Manager background · TBA" }),

  [MSG.AUTH_LOGIN]: () => oauth.login(),
  [MSG.AUTH_LOGOUT]: () => oauth.logout(),
  [MSG.AUTH_STATE]: () => oauth.getAuthState(),
  [MSG.ACCOUNT_SWITCH]: (p) => oauth.switchAccount(p.accountId),
  GET_CONTEXT: () => oauth.getApplicationContext(),

  [MSG.LIST_VIDEOS]: async (p) => {
    const ctx = await oauth.getApplicationContext();
    const records = await cache.getRecords(ctx.channelId, Boolean(p?.force));
    return { videos: records, channel: await cache.getChannelCard(ctx.channelId) };
  },
  [MSG.GET_QUOTA]: async () => {
    const ctx = await oauth.getApplicationContext();
    return quota.getUsage(ctx.channelId);
  },

  [MSG.RUN_BATCH]: (p) => handleRunBatch(p),
  [MSG.PAUSE_JOB]: () => pauseJob(),
  [MSG.CANCEL_JOB]: () => cancelJob(),
  [MSG.RESUME_JOB]: async () => {
    const job = await getJob();
    if (!job) return null;
    const records = await cache.getRecords(job.channelId);
    return resumeJob({ applyItem: makeApplyItem(job.action, job.channelId, new Map(records.map((r) => [r.id, r]))) });
  },
  [MSG.JOB_STATE]: () => getJob(),

  [MSG.UNDO_BATCH]: async (p) => {
    const ctx = await oauth.getApplicationContext();
    const out = await history.undoBatch(ctx.channelId, p.batchId, async (prev) => {
      const rec = await cache.getRecord(ctx.channelId, prev.id);
      await updateVideoSnippet(ctx.channelId, { ...prev, categoryId: prev.categoryId ?? rec?.categoryId });
      await cache.patchRecord(ctx.channelId, prev.id, { title: prev.title, description: prev.description, tags: prev.tags });
    }, p.videoId ?? null);
    notifyPopup("UNDO_DONE", out);
    return out;
  },
  [MSG.HISTORY_LIST]: async () => {
    const ctx = await oauth.getApplicationContext();
    return history.listHistory(ctx.channelId);
  },

  [MSG.TEMPLATES_GET]: async () => (await import("../shared/storage.js")).get("yt.templates", []),
  [MSG.TEMPLATES_SAVE]: async (tpl) => {
    const { update } = await import("../shared/storage.js");
    return update("yt.templates", (list = []) => {
      const i = list.findIndex((x) => x.id === tpl.id);
      const item = { ...tpl, id: tpl.id || `t-${Date.now()}` };
      if (i >= 0) list[i] = item; else list.unshift(item);
      return list.slice(0, 100);
    });
  },
  [MSG.TEMPLATES_DELETE]: async (p) => {
    const { update } = await import("../shared/storage.js");
    return update("yt.templates", (list = []) => list.filter((x) => x.id !== p.id));
  },

  [MSG.UPLOAD_INIT]: (p) => upload.initUpload(p.meta),
  [MSG.UPLOAD_CHUNK]: (p) => upload.sendChunk(p.uploadId, p.dataB64),
  [MSG.UPLOAD_STATE]: () => upload.uploadState(),
  [MSG.UPLOAD_CANCEL]: (p) => upload.cancelUpload(p.uploadId),

  [MSG.ANALYTICS_QUERY]: async (p) => {
    const ctx = await oauth.getApplicationContext();
    return analytics.queryReport(ctx.channelId, p);
  },
  [MSG.SETTINGS_GET]: () => getSettings(),
  [MSG.SETTINGS_SAVE]: (p) => import("../shared/settings.js").then((m) => m.saveSettings(p.section, p.patch)),
};

browser.runtime.onMessage.addListener((msg) => {
  const handler = handlers[msg?.type];
  if (!handler) return undefined;
  return Promise.resolve(handler(msg.payload))
    .then((data) => ({ ok: true, data }))
    .catch((err) => ({ ok: false, error: { code: err?.code ?? "INTERNAL", message: String(err?.message ?? err) } }));
});

// ── §4: MV3 lifecycle ──────────────────────────────────
browser.runtime.onInstalled.addListener((details) => {
  console.info("%cT-Manager by TBA — github.com/tbahsan", "color:#f00;font-weight:bold", details.reason);
});

async function wake() {
  const job = await getJob();
  if (job?.state === "RUNNING") {
    const records = await cache.getRecords(job.channelId);
    resumeInterrupted(makeApplyItem(job.action, job.channelId, new Map(records.map((r) => [r.id, r]))));
  }
}
browser.runtime.onStartup.addListener(wake);
browser.runtime.onActivated?.addListener?.(wake);
