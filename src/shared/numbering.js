/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/shared/numbering.js
 *  Purpose : Batch numbering engine — Bangla/English digits,
 *            zero-pad, start/step. Pure functions, no browser
 *            APIs → fully unit-testable (plan §৯.১).
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 *  Updated : 2026-09-20 (v0.1.0 — M0)
 * ───────────────────────────────────────────────────────
 *  HOW TO READ THIS FILE
 *   §1 — Digit conversion (EN ⇄ BN)
 *   §2 — Number formatting (pad + digits)
 *   §3 — Sequence generation (start, step, count)
 * ═══════════════════════════════════════════════════════
 */

// ── §1: Digit conversion ───────────────────────────────
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** "2026" → "২০২৬". Non-digit chars pass through untouched. */
export function toBanglaDigits(str) {
  return String(str).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** "২০২৬" → "2026" (used when re-numbering older Bangla titles). */
export function toEnglishDigits(str) {
  return String(str).replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

// ── §2: Number formatting ──────────────────────────────
/**
 * Formats one sequence number.
 * @param {number} n            Absolute number (already includes start offset).
 * @param {{digits?: "bn"|"en", pad?: number}} [opts]
 * @returns {string} e.g. formatNumber(7, {digits:"bn", pad:2}) → "০৭"
 */
export function formatNumber(n, opts = {}) {
  const { digits = "en", pad = 0 } = opts;
  let s = String(Math.trunc(n));
  if (pad > s.length) s = "0".repeat(pad - s.length) + s;
  return digits === "bn" ? toBanglaDigits(s) : s;
}

// ── §3: Sequence generation ────────────────────────────
/**
 * Generates the number column for a batch.
 * @param {{start?: number, step?: number, count: number, digits?: "bn"|"en", pad?: number}} cfg
 * @returns {string[]} ["১","৩","৫", …] length = cfg.count
 */
export function generateSequence(cfg) {
  const { start = 1, step = 1, count, ...fmt } = cfg;
  return Array.from({ length: count }, (_, i) => formatNumber(start + i * step, fmt));
}
