/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/shared/templates.js
 *  Purpose : Title/description template engine.
 *            Placeholders: {n} {title} {date} {prefix} {category}
 *            Pure + testable; throws TemplateError on unknown
 *            tokens so typos surface in the PREVIEW, never live.
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 *  Updated : 2026-09-20 (v0.1.0 — M0)
 * ───────────────────────────────────────────────────────
 *  HOW TO READ THIS FILE
 *   §1 — Placeholder regex + error type
 *   §2 — renderTemplate(): replace → truncate
 *  Example: renderTemplate("শর্ট-{n}", {n:"৩"}) → {text:"শর্ট-৩", truncated:false}
 * ═══════════════════════════════════════════════════════
 */

// ── §1: Regex + error type ─────────────────────────────
const PLACEHOLDER_RE = /\{(n|title|date|prefix|category)(?::([^}]+))?\}/g;
const UNKNOWN_RE = /\{[^{}\n]+\}/; // any leftover {token} = typo

export class TemplateError extends Error {
  constructor(token) {
    super(`Unknown template placeholder: {${token}}`);
    this.name = "TemplateError";
  }
}

// ── §2: renderTemplate ─────────────────────────────────
/**
 * Renders a template string into its final form for one video.
 *
 * @param {string} template  e.g. "{prefix}-{n} | {title}"
 * @param {object} ctx       { n, title, date, prefix, category } — date = Date|string
 * @param {{maxLength?: number}} [opts]  YouTube title limit is 100 chars.
 * @returns {{text: string, truncated: boolean}}
 */
export function renderTemplate(template, ctx, opts = {}) {
  const { maxLength = 100 } = opts;
  const out = template.replace(PLACEHOLDER_RE, (_m, key, arg) => {
    switch (key) {
      case "n": return String(ctx.n ?? "");
      case "title": return String(ctx.title ?? "");
      case "prefix": return String(ctx.prefix ?? "");
      case "category": return String(ctx.category ?? "");
      case "date": return formatDate(ctx.date, arg || "YYYY-MM-DD");
      default: throw new TemplateError(key); // unreachable; kept for safety
    }
  });
  const stray = out.match(UNKNOWN_RE);
  if (stray) throw new TemplateError(stray[0].slice(1, -1));
  const truncated = out.length > maxLength;
  return { text: truncated ? out.slice(0, maxLength) : out, truncated };
}

/** Formats a Date (or ISO string) using a YYYY-MM-DD style pattern. */
function formatDate(value, pattern) {
  const d = value instanceof Date ? value : new Date(value ?? Date.now());
  const p = (x, l = 2) => String(x).padStart(l, "0");
  return pattern
    .replace(/YYYY/g, d.getFullYear())
    .replace(/MM/g, p(d.getMonth() + 1))
    .replace(/DD/g, p(d.getDate()))
    .replace(/HH/g, p(d.getHours()))
    .replace(/mm/g, p(d.getMinutes()));
}
