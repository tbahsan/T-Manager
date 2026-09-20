/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/shared/settings.js
 *  Purpose : Typed access to yt.settings (locale, upload prefs,
 *            Pro-mode client IDs). Used by popup AND background.
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 * ═══════════════════════════════════════════════════════
 */
import { get, update } from "./storage.js";

export const DEFAULTS = {
  locale: "en",                // English-first (user-confirmed, plan §১২.৪)
  upload: { privacy: "unlisted", madeForKids: false }, // last-used, pre-filled each pre-flight
  clientIds: { chrome: "", firefox: "" },               // Pro-mode overrides (plan §৬)
  rename: { prefixShort: "শর্ট", prefixLong: "লং", digits: "bn", start: 1, step: 1, pad: 0 },
};

export async function getSettings() {
  return { ...structuredClone(DEFAULTS), ...(await get("yt.settings", {})) };
}

/** Merge-patch one section: saveSettings("upload", {privacy:"public"}) */
export async function saveSettings(section, patch) {
  return update("yt.settings", (s = {}) => ({ ...structuredClone(DEFAULTS), ...s, [section]: { ...(s[section] ?? {}), ...patch } }));
}
