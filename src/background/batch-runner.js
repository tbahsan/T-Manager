/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/background/batch-runner.js
 *  Purpose : Executes batch jobs with concurrency-ready loop,
 *            pause/cancel, CRASH-SAFE checkpoints and live
 *            progress events to the popup. The MV3 service
 *            worker may die any second — every transition is
 *            persisted BEFORE the risky work happens.
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 * ───────────────────────────────────────────────────────
 *  HOW TO READ THIS FILE
 *   §1 — Job state machine + control flags (same-SW messaging)
 *   §2 — createJob()/runBatch(): persist → act → checkpoint
 *   §3 — pause/cancel/resume entry points (called by router)
 *  INVARIANT: the undo snapshot is persisted by the router
 *  BEFORE createJob() — no write without history (plan §১০).
 * ═══════════════════════════════════════════════════════
 */
import browser from "webextension-polyfill";
import { get, set } from "../shared/storage.js";

// ── §1 ─────────────────────────────────────────────────
export const JOB_STATE = { QUEUED: "QUEUED", RUNNING: "RUNNING", PAUSED: "PAUSED", DONE: "DONE", CANCELLED: "CANCELLED", FAILED: "FAILED" };

// Same-SW control flags: PAUSE_JOB/CANCEL_JOB messages flip these;
// the running loop polls them between items (no storage round-trip).
const control = { pauseRequested: false, cancelRequested: false };

/** Fire-and-forget progress push to the popup (may be closed → ignore). */
export function notifyPopup(type, payload) {
  browser.runtime.sendMessage({ type, ...payload }).catch(() => {});
}

// ── §2 ─────────────────────────────────────────────────
export async function createJob(spec) {
  control.pauseRequested = control.cancelRequested = false;
  const job = { ...spec, state: JOB_STATE.QUEUED, done: 0, failures: [], checkpoint: 0, createdAt: new Date().toISOString() };
  await set("yt.activeJob", job);
  return job;
}

/**
 * Runs the active job item-by-item.
 * @param {Function} applyItem async ({id, patch}) → performs ONE write
 */
export async function runBatch({ applyItem }) {
  const job = await get("yt.activeJob");
  if (!job) throw Object.assign(new Error("No active job"), { code: "NO_JOB" });

  job.state = JOB_STATE.RUNNING;
  await set("yt.activeJob", job); // persist BEFORE acting — SW may die now
  notifyPopup("JOB_PROGRESS", { done: job.done, total: job.items.length, state: job.state });

  for (let i = job.checkpoint; i < job.items.length; i++) {
    if (control.pauseRequested || control.cancelRequested) break;
    const item = job.items[i];
    try {
      await applyItem(item);
      job.done++;
    } catch (err) {
      job.failures.push({ id: item.id, reason: String(err?.message ?? err) });
    }
    job.checkpoint = i + 1;
    await set("yt.activeJob", job); // checkpoint EVERY item — MV3-proof
    notifyPopup("JOB_PROGRESS", { done: job.done, total: job.items.length, state: job.state, lastError: job.failures.at(-1)?.reason });
  }

  if (control.cancelRequested) job.state = JOB_STATE.CANCELLED;
  else if (control.pauseRequested) job.state = JOB_STATE.PAUSED;
  else if (job.checkpoint >= job.items.length) job.state = job.failures.length ? "PARTIAL" : JOB_STATE.DONE;
  else job.state = JOB_STATE.PAUSED;

  await set("yt.activeJob", job);
  notifyPopup("JOB_DONE", { state: job.state, done: job.done, total: job.items.length, failures: job.failures });
  return job;
}

// ── §3 ─────────────────────────────────────────────────
export async function pauseJob() {
  control.pauseRequested = true;
  return get("yt.activeJob");
}
export async function cancelJob() {
  control.cancelRequested = true;
  return get("yt.activeJob");
}
export async function resumeJob({ applyItem }) {
  const job = await get("yt.activeJob");
  if (job && [JOB_STATE.RUNNING, JOB_STATE.PAUSED, JOB_STATE.QUEUED].includes(job.state)) return runBatch({ applyItem });
  return job ?? null;
}
export async function getJob() {
  return get("yt.activeJob");
}

/** Called from onStartup/onActivated — resume a job interrupted by SW death. */
export async function resumeInterrupted(applyItem) {
  const job = await get("yt.activeJob");
  if (job?.state === JOB_STATE.RUNNING) return runBatch({ applyItem });
  return null;
}
