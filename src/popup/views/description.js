/**
 * File    : src/popup/views/description.js
 * Purpose : Batch description — D1 replace / D2 append / D3
 *           prepend with {existing}/{date} placeholders (§৯.২).
 * Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 */
import { h, requireAuth, targetPicker, previewTable, progressBar, onEvent } from "../shared/ui.js";
import { estimateBatchCost, canRunBatch } from "../../shared/quota-model.js";

export const description = {
  id: "description", title: "Desc", icon: "📝",
  async render(el, { send }) {
    await requireAuth(el, { send }, async () => {
      const { videos } = await send("LIST_VIDEOS", {});
      const state = { selected: [], mode: "d2" };
      const pickerMount = h("div", {});
      const text = h("textarea", { rows: 5, placeholder: "Write the text…\n{existing} = the old description · {date} = today" }, "📅 Uploaded: {date}\n🔗 More on my channel!");
      const previewMount = h("div", {});
      const costNote = h("div", { class: "cost-note" }, "Select videos to see cost.");
      const runBtn = h("button", { class: "btn", disabled: true, onclick: run }, "▶ Run batch");
      const progress = progressBar(0, { onPause: () => send("PAUSE_JOB"), onCancel: () => send("CANCEL_JOB") });

      function render(text0, tpl) {
        const t = tpl.replaceAll("{existing}", text0).replaceAll("{date}", new Date().toISOString().slice(0, 10));
        switch (state.mode) {
          case "d1": return t;
          case "d2": return `${text0}\n\n${t}`;
          case "d3": return `${t}\n\n${text0}`;
        }
      }
      function preview() {
        const rows = state.selected.map((v) => ({
          old: v.description.slice(0, 60) || "(empty)",
          next: render(v.description, text.value).slice(0, 80),
        }));
        previewMount.replaceChildren(previewTable(rows));
        const units = estimateBatchCost({ description: true, videoCount: rows.length }).units;
        costNote.textContent = rows.length ? `${rows.length} descriptions · ${units} units (merged update).` : "Select videos to see cost.";
        runBtn.disabled = !rows.length;
        return rows;
      }
      async function run() {
        const rows = preview();
        const usage = await send("GET_QUOTA");
        const gate = canRunBatch({ units: rows.length * 50, usedToday: usage.used });
        if (!gate.ok) return alert(gate.reason);
        if (!confirm(`Update ${rows.length} descriptions (~${rows.length * 50} units)?`)) return;
        runBtn.disabled = true;
        const off = onEvent("JOB_DONE", ({ state: st, done, failures }) => {
          off(); alert(`Batch ${st}: ${done} ok, ${failures.length} failed.`); location.reload();
        });
        await send("RUN_BATCH", {
          action: "description",
          items: rows.map((r, i) => ({ id: state.selected[i].id, patch: { description: render(state.selected[i].description, text.value) } })),
          costPreview: rows.length * 50,
        });
      }

      el.append(
        h("div", { class: "card" }, h("b", {}, "① Target"),
          h("div", { class: "hint" }, "Same picker in every tab — chips select whole groups, or search + tick individual videos."),
          pickerMount),
        h("div", { class: "card" },
          h("b", {}, "② Mode"),
          [["d1", "Replace all"], ["d2", "Append (keep old) ⭐"], ["d3", "Prepend (top)"]].map(([v, l]) =>
            h("label", {}, h("input", { type: "radio", name: "dmode", value: v, checked: v === "d2", onchange: (e) => { state.mode = e.target.value; preview(); } }), ` ${l}`)),
          h("div", { class: "hint" }, "Replace = old text fully removed (still undoable from History) · Append = your text goes BELOW the old one — safest, best for links/credits · Prepend = your text goes on TOP — good for sponsors/announcements."),
          text),
        h("div", { class: "card" }, h("b", {}, "③ Preview"), previewMount, costNote),
        runBtn, progress.el,
      );
      targetPicker(pickerMount, videos, (sel) => { state.selected = sel; preview(); });
      preview();
    });
  },
};
