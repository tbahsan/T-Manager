/**
 * File    : src/popup/views/history.js
 * Purpose : Batch history + UNDO (batch-level; 50u/video cost
 *           preview before restore — plan §১০).
 * Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 */
import { h, requireAuth } from "../shared/ui.js";

export const history = {
  id: "history", title: "History", icon: "↩️",
  async render(el, { send }) {
    await requireAuth(el, { send }, async () => {
      const list = await send("HISTORY_LIST");
      const mount = h("div", {});

      if (!list.length) {
        mount.append(h("p", { class: "muted" }, "No batches yet. Every rename/desc/tags/thumb run lands here with full undo."));
      } else {
        mount.append(...list.map((r) => {
          const undoBtn = h("button", { class: "chip", onclick: async () => {
            const cost = r.videos.length * 50;
            if (r.action === "delete") return alert("Delete batches have no undo (prevented at the UI).");
            if (!confirm(`Undo "${r.action}" (${r.videos.length} videos) for ~${cost} units?`)) return;
            undoBtn.disabled = true;
            try {
              const out = await send("UNDO_BATCH", { batchId: r.batchId });
              alert(`Undone: ${out.undone} videos${out.failures.length ? `, ${out.failures.length} failed` : ""}.`);
              location.reload();
            } catch (e) { alert(e.message); undoBtn.disabled = false; }
          } }, r.status === "undone" ? "✔ Undone" : "↩️ Undo");
          if (r.status === "undone") undoBtn.disabled = true;

          return h("div", { class: "card row-between" },
            h("div", {},
              h("b", {}, `${r.action} · ${r.videos.length} videos`),
              h("div", { class: "muted small" }, `${new Date(r.at).toLocaleString()} · ${r.batchId}`)),
            undoBtn);
        }));
      }

      el.append(h("div", { class: "card" }, h("b", {}, "↩️ Batch history (last 50)"),
        h("div", { class: "hint" }, "Undo restores the previous titles/descriptions/tags — costs 50 units per video, always shown before you confirm. Delete batches have no undo (Google's API can't bring videos back).")), mount,
        h("p", { class: "muted small" }, "Snapshots come from your local cache — undo never re-reads metadata (0 units to prepare)."));
    });
  },
};
