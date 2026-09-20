/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/shared/storage.js
 *  Purpose : Thin, namespaced wrapper over storage.local —
 *            the ONLY module that touches raw storage keys.
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 *  Updated : 2026-09-20 (v0.1.0 — M0)
 *  Plan ref: §৮ Data Model
 * ═══════════════════════════════════════════════════════
 */
import browser from "webextension-polyfill";

/** Read one JSON-serializable value (defaultValue when absent). */
export async function get(key, defaultValue = null) {
  const bag = await browser.storage.local.get(key);
  return key in bag ? bag[key] : defaultValue;
}

/** Write one value (single-key write = cheap + atomic per key). */
export async function set(key, value) {
  return browser.storage.local.set({ [key]: value });
}

/** Read-modify-write helper. mutator receives (current) → next. */
export async function update(key, mutator, defaultValue = null) {
  const bag = await browser.storage.local.get(key);
  const present = key in bag && bag[key] !== null && bag[key] !== undefined;
  // Pass `undefined` (never null) when the key is absent — callers rely on
  // default parameters like (list = []), which do NOT trigger on null.
  // This was the first-login crash: "Cannot read properties of null (reading 'filter')".
  const next = mutator(present ? bag[key] : defaultValue !== null ? defaultValue : undefined);
  await set(key, next);
  return next;
}

/** Remove keys (accepts one key or an array). */
export async function remove(keys) {
  return browser.storage.local.remove(keys);
}
