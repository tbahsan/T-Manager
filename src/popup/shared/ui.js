/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/popup/shared/ui.js
 *  Purpose : Tiny DOM helpers + the SHARED Target Picker
 *            (plan §৯.০) + preview table + progress bar.
 *            Every write-workflow tab composes these — that is
 *            how "2-3 ways per workflow" stays consistent.
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 * ───────────────────────────────────────────────────────
 *   §1 — h(): hyperscript helper
 *   §2 — requireAuth(): connect card when signed out
 *   §3 — targetPicker(): chips (All/Shorts/Longs) + search +
 *        checkbox list  → returns {selected, onChange}
 *   §4 — previewTable(), quotaBar(), progressBar()
 *   §5 — event bus (background JOB_* events → views)
 * ═══════════════════════════════════════════════════════
 */

// ── §1: hyperscript ────────────────────────────────────
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "style") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v !== false && v !== null && v !== undefined) el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) el.append(c?.nodeType ? c : document.createTextNode(String(c ?? "")));
  return el;
}

export const fmtDate = (iso) => new Date(iso).toLocaleDateString();
export const kindBadge = (kind) => h("span", { class: `badge ${kind}` }, kind === "short" ? "Short" : "Long");

// ── §2: auth gate ──────────────────────────────────────
/** Renders a Connect card instead of the view when signed out. Returns false if blocked. */
export function requireAuth(el, { send }, render) {
  return send("AUTH_STATE")
    .then((auth) => {
      if (auth.signedIn) return render();
      el.append(
        h("div", { class: "card center" },
          h("p", {}, "Connect your YouTube channel to use this tab."),
          h("button", { class: "btn", onclick: () => send("AUTH_LOGIN").then(() => location.reload()).catch((e) => alert(e.message)) }, "▶ Connect YouTube"),
        ),
      );
      return false;
    })
    .catch((e) => { el.append(h("div", { class: "card" }, h("p", { class: "muted" }, `Error: ${e.message}`))); return false; });
}

// ── §3: Target picker (plan §৯.০) ──────────────────────
/**
 * @param {HTMLElement} mount
 * @param {Array<object>} videos  cached records
 * @param {Function} onChange(selectedArray)
 * @returns {{selected: Array, refresh(): void}} — call refresh() after list changes
 */
export function targetPicker(mount, videos, onChange) {
  const state = { selected: new Map() }; // id → record
  const emit = () => onChange([...state.selected.values()]);

  const counter = h("span", { class: "muted" }, "0 selected");
  const listEl = h("div", { class: "pick-list" });
  const search = h("input", { type: "search", placeholder: "Search titles…", class: "input", oninput: () => refresh() });

  function row(v) {
    const cb = h("input", { type: "checkbox", "data-id": v.id });
    cb.checked = state.selected.has(v.id);
    cb.addEventListener("change", () => {
      cb.checked ? state.selected.set(v.id, v) : state.selected.delete(v.id);
      counter.textContent = `${state.selected.size} selected`;
      emit();
    });
    return h("label", { class: "pick-row" }, cb,
      kindBadge(v.kind),
      h("span", { class: "pick-title" }, v.title),
      h("span", { class: "muted small" }, fmtDate(v.publishedAt)));
  }

  function refresh() {
    const q = search.value.toLowerCase();
    const shown = videos.filter((v) => !q || v.title.toLowerCase().includes(q));
    listEl.replaceChildren(...shown.map(row));
  }

  const setAll = (pred) => {
    state.selected.clear();
    videos.filter(pred).forEach((v) => state.selected.set(v.id, v));
    counter.textContent = `${state.selected.size} selected`;
    refresh();
    emit();
  };

  mount.append(
    h("div", { class: "card" },
      h("div", { class: "chips" },
        h("button", { class: "chip", title: "Select every video in your channel", onclick: () => setAll(() => true) }, "All"),
        h("button", { class: "chip", title: "Videos of 60 seconds or less", onclick: () => setAll((v) => v.kind === "short") }, "✂️ All Shorts"),
        h("button", { class: "chip", title: "Videos longer than 60 seconds", onclick: () => setAll((v) => v.kind !== "short") }, "🎬 All Longs"),
        h("button", { class: "chip", title: "Deselect everything", onclick: () => { state.selected.clear(); counter.textContent = "0 selected"; refresh(); emit(); } }, "Clear"),
        counter),
      search,
      h("div", { class: "hint" }, "Chips select whole groups instantly · search + ticks for individual picks."),
      listEl),
  );
  refresh();
  return { get selected() { return [...state.selected.values()]; }, refresh };
}

// ── §4: preview / quota / progress ─────────────────────
/** rows: [{old, next, warn?}] — before → after table. */
export function previewTable(rows, cap = 8) {
  if (!rows.length) return h("p", { class: "muted" }, "Select videos to see the preview.");
  const tr = (r) => h("tr", {},
    h("td", { class: "old" }, r.old || "—"), h("td", { class: "arrow" }, "→"),
    h("td", { class: r.warn ? "warn" : "next" }, r.next || "—", r.warn ? " ⚠️" : ""));
  return h("div", {},
    h("table", { class: "preview" }, h("tbody", {}, rows.slice(0, cap).map(tr))),
    rows.length > cap ? h("p", { class: "muted small" }, `+ ${rows.length - cap} more…`) : null,
    h("p", { class: "muted small" }, `${rows.length} videos in this batch.`));
}

export function quotaBar(usage) {
  const pct = Math.min(100, usage.percent);
  return h("div", { class: "card" },
    h("div", { class: "row-between" }, h("b", {}, `⚡ Quota today`), h("span", { class: "muted" }, `${usage.used} / ${usage.limit} units`)),
    h("div", { class: "bar" }, h("div", { class: `bar-fill ${usage.warn ? "hot" : ""}`, style: { width: `${pct}%` } })));
}

/** Progress with pause/cancel; wiring handled by the view. */
export function progressBar(total, { onPause, onCancel }) {
  const fill = h("div", { class: "bar-fill", style: { width: "0%" } });
  const label = h("span", { class: "muted" }, `0 / ${total}`);
  const wrap = h("div", { class: "card", hidden: true }, h("div", { class: "row-between" }, label,
    h("span", {}, h("button", { class: "chip", onclick: onPause }, "⏸ Pause"), " ",
      h("button", { class: "chip", onclick: onCancel }, "✖ Cancel"))), h("div", { class: "bar" }, fill));
  return {
    el: wrap,
    update(done, total_, lastError) {
      wrap.hidden = false;
      fill.style.width = `${total_ ? (done / total_) * 100 : 0}%`;
      label.textContent = lastError ? `${done} / ${total_} · ${lastError}` : `${done} / ${total_}`;
    },
  };
}

// ── §5: event bus (bg → views) ─────────────────────────
const listeners = new Map();
export function onEvent(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => listeners.get(type)?.delete(fn);
}
export function emitEvent(type, payload) {
  listeners.get(type)?.forEach((fn) => fn(payload));
}
