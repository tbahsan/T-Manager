/**
 * File    : src/popup/views/tags.js
 * Purpose : Batch tags — G1 merge ⭐ / G2 replace / G3 remove,
 *           with the 500-char live validation (§৯.৩).
 * Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 */
import { h, requireAuth, targetPicker, previewTable, progressBar, onEvent } from "../shared/ui.js";
import { estimateBatchCost } from "../../shared/quota-model.js";

export const tags = {
  id: "tags", title: "Tags", icon: "🏷️",
  async render(el, { send }) {
    await requireAuth(el, { send }, async () => {
      const { videos } = await send("LIST_VIDEOS", {});
      const state = { selected: [], mode: "g1" };
      const pickerMount = h("div", {});
      const counter = h("span", { class: "muted small", title: "YouTube allows max 500 characters across all tags of one video" }, "0 / 500 chars");
      const input = h("input", { class: "input", placeholder: "tag one, tag two, …", oninput: () => { validate(); preview(); } });
      const previewMount = h("div", {});
      const costNote = h("div", { class: "cost-note" }, "Select videos to see cost.");
      const runBtn = h("button", { class: "btn", disabled: true, onclick: run }, "▶ Run batch");
      const progress = progressBar(0, { onPause: () => send("PAUSE_JOB"), onCancel: () => send("CANCEL_JOB") });
      let over = false;

      const parse = () => input.value.split(",").map((x) => x.trim()).filter(Boolean);
      function validate() {
        const len = parse().join("").length;
        counter.textContent = `${len} / 500 chars`;
        over = len > 500;
        counter.style.color = over ? "var(--accent)" : "";
      }
      function nextTags(v) {
        const add = parse();
        if (state.mode === "g2") return add;
        if (state.mode === "g1") return [...new Set([...v.tags, ...add])];
        return v.tags.filter((x) => !add.includes(x)); // g3 remove
      }
      function preview() {
        const rows = state.selected.map((v) => ({ old: v.tags.join(", ") || "(none)", next: nextTags(v).join(", ").slice(0, 80) }));
        previewMount.replaceChildren(previewTable(rows));
        const units = estimateBatchCost({ tags: true, videoCount: rows.length }).units;
        costNote.textContent = rows.length ? `${rows.length} videos · ${units} units${over ? " · ⚠️ tags over 500 chars!" : ""}` : "Select videos to see cost.";
        runBtn.disabled = !rows.length || over;
        return rows;
      }
      async function run() {
        const rows = preview();
        if (!confirm(`Update tags on ${rows.length} videos (~${rows.length * 50} units)?`)) return;
        runBtn.disabled = true;
        const off = onEvent("JOB_DONE", ({ state: st, done, failures }) => {
          off(); alert(`Batch ${st}: ${done} ok, ${failures.length} failed.`); location.reload();
        });
        await send("RUN_BATCH", { action: "tags", items: state.selected.map((v) => ({ id: v.id, patch: { tags: nextTags(v) } })), costPreview: rows.length * 50 });
      }

      el.append(
        h("div", { class: "card" }, h("b", {}, "① Target"),
          h("div", { class: "hint" }, "Same picker in every tab — chips select whole groups, or search + tick individual videos."),
          pickerMount),
        h("div", { class: "card" },
          h("b", {}, "② Mode"),
          [["g1", "Add / merge (safe) ⭐"], ["g2", "Replace all"], ["g3", "Remove specific"]].map(([v, l]) =>
            h("label", {}, h("input", { type: "radio", name: "gmode", value: v, checked: v === "g1", onchange: (e) => { state.mode = e.target.value; preview(); } }), ` ${l}`)),
          h("div", { class: "hint" }, "Merge = add yours, keep existing, skip duplicates (safest) · Replace = wipe ALL tags, use only yours · Remove = delete just the tags you type here."),
          input, counter),
        h("div", { class: "card" }, h("b", {}, "③ Preview"), previewMount, costNote),
        runBtn, progress.el,
      );
      targetPicker(pickerMount, videos, (sel) => { state.selected = sel; preview(); });
      preview();
    });
  },
};
