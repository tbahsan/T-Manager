/**
 * File    : src/popup/views/settings.js
 * Purpose : Settings — language (EN default/বাংলা), Pro mode
 *           client IDs (own quota, §৬), template list, About
 *           card (TBA credit, §২.6), sign out.
 * Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 */
import { h } from "../shared/ui.js";
import browser from "webextension-polyfill";
import { getSettings } from "../../shared/settings.js";

export const settings = {
  id: "settings", title: "Settings", icon: "⚙️",
  async render(el, { send }) {
    const s = await getSettings();

    // ── Language ──
    const locale = h("select", { class: "input" },
      h("option", { value: "en" }, "English (default)"), h("option", { value: "bn" }, "বাংলা"));
    locale.value = s.locale;
    locale.addEventListener("change", async (e) => {
      const { saveSettings: save } = await import("../../shared/settings.js");
      await save("locale", e.target.value);
      location.reload();
    });
    el.append(h("div", { class: "card" }, h("b", {}, "🌐 Language / ভাষা"),
        h("div", { class: "hint" }, "English is the default interface; switch to বাংলা and the whole app follows."),
        locale));

    // ── Pro mode (own OAuth client = own quota) ──
    const chromeId = h("input", { class: "input", placeholder: "Chrome client ID (optional override)", value: s.clientIds?.chrome ?? "" });
    const ffId = h("input", { class: "input", placeholder: "Firefox client ID (optional override)", value: s.clientIds?.firefox ?? "" });
    el.append(
      h("div", { class: "card" },
        h("b", {}, "🔑 Pro mode — your own quota"),
        h("p", { class: "muted small" }, "All users of the bundled client share one 10,000u/day. Paste YOUR OAuth client ID (GCP → Credentials → Web application) to use your own quota. Guide: docs/QUOTA.md."),
        h("p", { class: "muted small" }, "This browser's OAuth redirect URI — add it under “Authorized redirect URIs” in your Google Cloud OAuth client (Credentials → your client ID):"),
        h("code", {
          class: "small",
          style: { display: "block", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 8px", cursor: "copy", wordBreak: "break-all" },
          title: "Click to copy",
          onclick: (e) => { navigator.clipboard?.writeText(e.target.textContent); e.target.textContent = "✓ Copied!"; },
        }, browser.identity.getRedirectURL()),
        chromeId, ffId,
        h("button", { class: "btn secondary", onclick: async () => {
          const { saveSettings: save } = await import("../../shared/settings.js");
          await save("clientIds", { chrome: chromeId.value.trim(), firefox: ffId.value.trim() });
          alert("Saved. Re-connect the channel to apply.");
        } }, "Save client IDs")),

      h("div", { class: "card" },
        h("b", {}, "🔌 Connection"),
        h("button", { class: "btn secondary", onclick: () => send("AUTH_LOGOUT").then(() => location.reload()) }, "Sign out of active channel")),

      // ── About (author credit — requirement #3) ──
      h("div", { class: "card center" },
        h("img", { src: "../icons/icon128.png", style: { width: "64px", borderRadius: "14px" } }),
        h("h3", { style: { margin: "8px 0 2px" } }, "T-Manager"),
        h("p", { class: "muted small", style: { marginTop: 0 } }, "Batch title/numbering, thumbnails, descriptions, tags, uploads, analytics & multi-channel for YouTube."),
        h("p", { style: { fontSize: "13px" } },
          h("b", {}, "Tasneem Bin Ahsan (TBA)"), h("br", {}),
          h("span", { class: "muted small" }, "Web Designer & Developer · Bangladesh"), h("br", {}),
          h("a", { href: "https://github.com/tbahsan", target: "_blank" }, "github.com/tbahsan"), " · ",
          h("a", { href: "https://tlogz.com", target: "_blank" }, "tlogz.com"), " · ",
          h("a", { href: "https://x.com/tbahsan", target: "_blank" }, "@tbahsan")),
        h("p", { class: "muted small" }, "MIT License · © 2026 TBA · Not affiliated with YouTube/Google."),
        h("button", { class: "btn secondary", onclick: () => browser.tabs?.create?.({ url: "https://github.com/tbahsan/t-manager" }) }, "⭐ Star on GitHub")),
    );
  },
};
