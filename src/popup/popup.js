/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/popup/popup.js
 *  Purpose : Tab router — builds the tab strip from the view
 *            registry below and wires header (chip + quota).
 *            The popup makes NO API calls; everything goes
 *            through runtime messages (plan §৩).
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 *  Updated : 2026-09-20 (v0.1.0 — M0 skeleton)
 * ───────────────────────────────────────────────────────
 *  HOW TO READ THIS FILE
 *   §1 — View registry (one line per tab; add new views here)
 *   §2 — Tab strip render + switching (keyboard accessible)
 *   §3 — Header: auth chip + quota badge via messages
 * ═══════════════════════════════════════════════════════
 */
import { dashboard } from "./views/dashboard.js";
import { upload } from "./views/upload.js";
import { rename } from "./views/rename.js";
import { thumbnails } from "./views/thumbnails.js";
import { description } from "./views/description.js";
import { tags } from "./views/tags.js";
import { analytics } from "./views/analytics.js";
import { history } from "./views/history.js";
import { settings } from "./views/settings.js";
import browser from "webextension-polyfill";
import { emitEvent } from "./shared/ui.js";
import { setLocale } from "../shared/i18n/index.js";
import { getSettings } from "../shared/settings.js";

// ── §1: View registry ──────────────────────────────────
const VIEWS = [dashboard, upload, rename, thumbnails, description, tags, analytics, history, settings];

// ── §2: Tabs ───────────────────────────────────────────
const nav = document.getElementById("tabs");
const main = document.getElementById("view");
let activeId = dashboard.id;

for (const v of VIEWS) {
  const b = document.createElement("button");
  b.className = "tab";
  b.role = "tab";
  b.textContent = `${v.icon} ${v.title}`;
  b.dataset.id = v.id;
  b.addEventListener("click", () => activate(v.id));
  nav.appendChild(b);
}

async function activate(id) {
  activeId = id;
  for (const el of nav.children) el.setAttribute("aria-selected", String(el.dataset.id === id));
  const view = VIEWS.find((v) => v.id === id);
  main.replaceChildren();
  await view.render(main, { send, go: activate });
}

// ── §3: Header wiring ──────────────────────────────────
/** Single message helper — every popup→bg call goes through this. */
export async function send(type, payload) {
  const res = await browser.runtime.sendMessage({ type, payload });
  if (!res?.ok) throw new Error(res?.error?.message ?? "Unknown background error");
  return res.data;
}

async function refreshHeader() {
  const badge = document.getElementById("quota-badge");
  const chip = document.getElementById("account-chip");
  try {
    const auth = await send("AUTH_STATE");
    chip.textContent = auth.signedIn ? auth.activeAccountId || "channel ▾" : "Sign in";
  } catch {
    chip.textContent = "…";
  }
  badge.textContent = "⚡ –"; // M6: real usage via QUOTA message
}


// Forward background job events into the view event bus (ui.js §5).
browser.runtime.onMessage.addListener((msg) => {
  if (["JOB_PROGRESS", "JOB_DONE", "UNDO_DONE"].includes(msg?.type)) emitEvent(msg.type, msg);
});

(async () => {
  const s = await getSettings();
  setLocale(s.locale);
  document.getElementById("app-name").textContent = s.locale === "bn" ? "টি-ম্যানেজার" : "T-Manager";
})();

refreshHeader();
activate(activeId);
