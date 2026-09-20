/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/popup/views/rename.js
 *  Purpose : Batch title + numbering — UI guide pass:
 *            every option carries an inline instruction, and the
 *            custom number style (text before/after the number,
 *            digits, zero-pad, separator) applies to ALL modes —
 *            including Prepend (keep-original). Core logic
 *            (computeRows → renderTemplate → RUN_BATCH) unchanged.
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Modes   : M1 Replace · M2 Prepend(keep) ⭐ · M3 Append · M4 Custom
 * ═══════════════════════════════════════════════════════
 */
import { h, requireAuth, targetPicker, previewTable, progressBar, onEvent } from "../shared/ui.js";
import { renderTemplate } from "../../shared/templates.js";
import { generateSequence, formatNumber } from "../../shared/numbering.js";
import { estimateBatchCost, canRunBatch } from "../../shared/quota-model.js";
import { getSettings } from "../../shared/settings.js";

const SAMPLE_TITLE = "Man walking alone"; // live example under each mode

export const rename = {
  id: "rename", title: "Rename", icon: "✏️",
  async render(el, { send }) {
    await requireAuth(el, { send }, async () => {
      const { videos } = await send("LIST_VIDEOS", {});
      const rn = (await getSettings()).rename;

      const state = {
        selected: [],
        mode: "m2", // default = "rename beside existing"
        before: "", after: "", sep: ". ",
        digits: rn.digits ?? "bn", start: rn.start ?? 1, step: rn.step ?? 1, pad: rn.pad ?? 0,
        prefixShort: rn.prefixShort ?? "শর্ট", prefixLong: rn.prefixLong ?? "লং",
      };

      // ── controls ──
      const beforeIn = h("input", { class: "input", value: state.before, placeholder: "e.g.  শর্ট-   ·   Ep   ·   (", oninput: (e) => { state.before = e.target.value; preview(); } });
      const afterIn = h("input", { class: "input", value: state.after, placeholder: "e.g.  :   ·   )   ·   —", oninput: (e) => { state.after = e.target.value; preview(); } });
      const sepIn = h("input", { class: "input", value: state.sep, placeholder: ". ", oninput: (e) => { state.sep = e.target.value; preview(); } });
      const prefixSIn = h("input", { class: "input", value: state.prefixShort, oninput: (e) => { state.prefixShort = e.target.value; preview(); } });
      const prefixLIn = h("input", { class: "input", value: state.prefixLong, oninput: (e) => { state.prefixLong = e.target.value; preview(); } });
      const numIn = (key, label, hint) => h("div", {},
        h("span", { class: "lab" }, label),
        h("input", { class: "input", type: "number", value: state[key], oninput: (e) => { state[key] = Number(e.target.value); preview(); } }),
        h("div", { class: "hint" }, hint));
      const digitsSel = h("select", { class: "input", onchange: (e) => { state.digits = e.target.value; preview(); } },
        h("option", { value: "bn" }, "১২৩ — Bangla digits"),
        h("option", { value: "en" }, "123 — English digits"));
      digitsSel.value = state.digits;
      let customText = "{prefix}-{n} | {title}";
      const customIn = h("input", { class: "input", value: customText, placeholder: "{prefix}-{n} | {title}", oninput: (e) => { customText = e.target.value; preview(); } });

      const pickMount = h("div", {});
      const previewMount = h("div", {});
      const patternLine = h("code", { class: "pattern" }, "");
      const costNote = h("div", { class: "cost-note" }, "Select videos to see cost.");
      const runBtn = h("button", { class: "btn", disabled: true, onclick: run }, "▶ Run batch");
      const progress = progressBar(0, { onPause: () => send("PAUSE_JOB"), onCancel: () => send("CANCEL_JOB") });

      // ── mode radios with live examples + per-mode hint ──
      const exSpans = {};
      function modeRow(value, label, star, hint) {
        const ex = h("div", { class: "example" }, "");
        exSpans[value] = ex;
        return h("div", { style: { margin: "2px 0 12px" } },
          h("label", {}, h("input", { type: "radio", name: "rmode", value, checked: value === state.mode,
            onchange: (e) => { state.mode = e.target.value; syncModeUI(); preview(); } }),
            ` ${label}${star ? " ⭐" : ""}`),
          ex,
          h("div", { class: "hint" }, hint));
      }
      const customWrap = h("div", { hidden: true },
        h("span", { class: "lab" }, "Custom template"),
        customIn,
        h("div", { class: "hint" }, "Placeholders: {n} = number · {title} = original · {prefix} = শর্ট/লং · {date} = publish date. Typos are blocked in the preview, never on YouTube."));
      function syncModeUI() {
        customWrap.hidden = state.mode !== "m4";
      }

      /** Builds the effective pattern for a mode from the Number-style fields. */
      function buildTemplate(mode) {
        const n = `${state.before}{n}${state.after}`;
        if (mode === "m1") return `{prefix}${n}`;
        if (mode === "m2") return `${n}${state.sep}{title}`;
        if (mode === "m3") return `{title}${state.sep}${n}`;
        return customText; // m4
      }

      /** Same computation as before — per-kind series + render + truncate warn. */
      function computeRows() {
        const rows = [];
        for (const kind of ["short", "long"]) {
          const group = state.selected.filter((v) => v.kind === kind);
          const seq = generateSequence({ start: state.start, step: state.step, count: group.length, digits: state.digits, pad: state.pad });
          group.forEach((v, i) => {
            const prefix = kind === "short" ? state.prefixShort : state.prefixLong;
            let out;
            try {
              out = renderTemplate(buildTemplate(state.mode), { n: seq[i], title: v.title, prefix, date: v.publishedAt, category: "" }, { maxLength: 100 });
            } catch (err) {
              out = { text: `⛔ ${err.message}`, truncated: false };
            }
            rows.push({ id: v.id, old: v.title, next: out.text, warn: out.truncated, patch: { title: out.text } });
          });
        }
        return rows;
      }

      function preview() {
        const sampleTitle = state.selected[0]?.title ?? SAMPLE_TITLE;
        const n0 = formatNumber(state.start, { digits: state.digits, pad: state.pad });
        const ctx = { n: n0, title: sampleTitle, prefix: state.prefixShort, date: new Date().toISOString() };
        for (const mode of ["m1", "m2", "m3", "m4"]) {
          let text;
          try { text = renderTemplate(buildTemplate(mode), ctx, { maxLength: 100 }).text; }
          catch (err) { text = `⛔ ${err.message}`; }
          exSpans[mode].textContent = `Example: ${text}`;
        }
        patternLine.textContent = `Current pattern: ${buildTemplate(state.mode)}`;

        const rows = computeRows();
        previewMount.replaceChildren(previewTable(rows.map(({ old, next, warn }) => ({ old, next, warn }))));
        const { units } = estimateBatchCost({ rename: true, videoCount: rows.length });
        costNote.textContent = rows.length ? `This batch: ${rows.length} videos · ${units} units.` : "Select videos to see cost.";
        runBtn.disabled = !rows.length;
        return rows;
      }

      async function run() {
        const rows = preview();
        const usage = await send("GET_QUOTA");
        const gate = canRunBatch({ units: rows.length * 50, usedToday: usage.used });
        if (!gate.ok) return alert(gate.reason);
        if (!confirm(`Rename ${rows.length} videos for ~${rows.length * 50} units?`)) return;
        runBtn.disabled = true;
        const doneOnce = onEvent("JOB_DONE", ({ state: st, done, failures }) => {
          doneOnce();
          alert(`Batch ${st}. Renamed: ${done}, failed: ${failures.length}.\nUndo anytime from the ↩️ History tab.`);
          location.reload();
        });
        await send("RUN_BATCH", { action: "rename", items: rows.map(({ id, patch }) => ({ id, patch })), costPreview: rows.length * 50 });
      }

      el.append(
        h("div", { class: "howto" },
          "How it works: ① choose videos → ② style the number (applies to EVERY mode) → ③ choose how the number joins the title → ④ check the preview → Run. Nothing changes until you press Run — and every run can be undone from ↩️ History."),

        h("div", { class: "card" },
          h("b", {}, "① Choose videos"),
          h("div", { class: "hint" }, "Chips select whole groups in one click; or search and tick videos individually."),
          pickMount),

        h("div", { class: "card" },
          h("b", {}, "② Number style — applies to ALL modes"),
          h("div", { class: "hint" }, "Wrap ANY text around the number — e.g. before “Ep ” and after “:” gives  Ep ১:  everywhere. Leave both empty for a plain ১."),
          h("div", { class: "frow" },
            h("div", {}, h("span", { class: "lab" }, "Text before number"), beforeIn),
            h("div", {}, h("span", { class: "lab" }, "Text after number"), afterIn)),
          h("div", { class: "frow" },
            h("div", {}, h("span", { class: "lab" }, "Digits"), digitsSel),
            h("div", {}, numIn("pad", "Zero-pad", "2 → ০১, ০২… instead of ১, ২…"))),
          h("div", { class: "frow" },
            h("div", {}, numIn("start", "Start at", "First number of this batch")),
            h("div", {}, numIn("step", "Step by", "2 → ১, ৩, ৫…"))),
          h("div", { class: "hint" }, "Shorts and Longs each get their own series — Shorts ১,২,৩… and Longs restart from “Start at”."),
          h("div", { class: "frow" },
            h("div", {}, h("span", { class: "lab" }, "Prefix — Shorts"), prefixSIn),
            h("div", {}, h("span", { class: "lab" }, "Prefix — Longs"), prefixLIn)),
          h("div", { class: "hint" }, "Prefixes are used by Replace mode and the {prefix} placeholder: শর্ট-১ / লং-১.")),

        h("div", { class: "card" },
          h("b", {}, "③ Mode — how the number meets the title"),
          h("div", { class: "hint" }, "The Example line under each mode updates live with your Number style and first selected video."),
          modeRow("m1", "Replace — number only", false, "Original title is removed. Best for clean series: শর্ট-১, শর্ট-২…"),
          modeRow("m2", "Prepend — keep original title", true, "Your original title stays untouched — the styled number is added in FRONT of it (rename beside existing)."),
          modeRow("m3", "Append — keep original title", false, "Original title stays — the styled number is added at the END."),
          modeRow("m4", "Custom template", false, "Free-form: put {n} and {title} wherever you like."),
          customWrap,
          h("div", { class: "frow", style: { marginTop: "4px" } },
            h("div", {}, h("span", { class: "lab" }, "Separator (Prepend & Append)"), sepIn),
            h("div", {}, h("div", { class: "lab" }, "Between number & title"), h("div", { class: "hint" }, "Only used by Prepend/Append — e.g. “. ” → ১. Title"))),
          patternLine),

        h("div", { class: "card" },
          h("b", {}, "④ Preview & run"),
          h("div", { class: "hint" }, "Old → new for every selected video. A ⚠️ row means it hit YouTube's 100-character title limit and was cut short."),
          previewMount, costNote),
        runBtn, progress.el,
      );

      targetPicker(pickMount, videos, (sel) => { state.selected = sel; preview(); });
      syncModeUI();
      preview();
    });
  },
};
