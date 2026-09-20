/**
 * File    : src/popup/views/dashboard.js
 * Purpose : Channel card + stats + quota bar + quick actions
 *           + recent history + guarded batch delete (§৯.৬).
 * Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 */
import { h, requireAuth, quotaBar, targetPicker, fmtDate } from "../shared/ui.js";
import { estimateBatchCost, canRunBatch } from "../../shared/quota-model.js";

export const dashboard = {
  id: "dashboard", title: "Dashboard", icon: "🏠",
  async render(el, { send, go }) {
    await requireAuth(el, { send }, async () => {
      const [{ videos, channel }, usage, history] = await Promise.all([
        send("LIST_VIDEOS", {}), send("GET_QUOTA"), send("HISTORY_LIST"),
      ]);
      const shorts = videos.filter((v) => v.kind === "short").length;

      el.append(
        h("div", { class: "card row-between" },
          h("div", {}, h("b", {}, channel?.title ?? "Channel"),
            h("div", { class: "muted small" }, `${videos.length} videos · ${channel?.syncedAt ? "synced " + fmtDate(channel.syncedAt) : ""}`)),
          h("button", { class: "chip", title: "Re-sync (costs ~1u/50 videos)", onclick: async (e) => {
            e.target.textContent = "Syncing…";
            await send("LIST_VIDEOS", { force: true });
            location.reload();
          } }, "🔄 Sync")),

        h("div", { class: "grid2" },
          h("div", { class: "stat" }, h("b", {}, String(videos.length)), h("span", {}, "Total videos")),
          h("div", { class: "stat" }, h("b", {}, `${shorts} / ${videos.length - shorts}`), h("span", {}, "Shorts / Longs"))),

        quotaBar(usage),

        h("div", { class: "card" },
          h("b", {}, "Quick actions"),
          h("div", { class: "hint" }, "Every action previews its changes and shows the quota cost BEFORE anything runs."),
          h("div", { class: "chips" },
            ...[["rename", "✏️ Rename"], ["thumbnails", "🖼️ Thumbs"], ["description", "📝 Desc"], ["tags", "🏷️ Tags"], ["upload", "⬆️ Upload"], ["analytics", "📊 Analytics"]]
              .map(([id, label]) => h("button", { class: "chip", onclick: () => go(id) }, label)))),

        h("div", { class: "card" },
          h("b", {}, "Recent batches"),
          history.length
            ? h("div", {}, ...history.slice(0, 3).map((r) =>
                h("div", { class: "row-between small", style: { padding: "5px 0" } },
                  h("span", {}, `${r.action} · ${r.videos.length} videos`),
                  h("span", { class: "muted" }, `${fmtDate(r.at)} · ${r.status}`))))
            : h("p", { class: "muted small" }, "No batches yet — every run lands here with undo.")),
      );

      // ── Danger zone: batch delete (triple-guarded, §৯.৬) ──
      const dz = h("details", { class: "card" });
      dz.append(h("summary", {}, "⚠️ Danger zone — batch delete"));
      const zone = h("div", {});
      dz.append(zone);
      el.append(dz);
      const picker = targetPicker(zone, videos, () => updateCost());
      const costNote = h("div", { class: "cost-note" }, "Select videos to see cost.");
      const confirmInput = h("input", { class: "input", placeholder: 'Type DELETE to enable (no undo!)' });
      const runBtn = h("button", { class: "btn", disabled: true, onclick: runDelete }, "🗑 Delete selected");
      function updateCost() {
        const n = picker.selected.length;
        const { units } = estimateBatchCost({ delete: n });
        costNote.textContent = n ? `${n} videos · ${units} units · ⚠️ DELETION IS PERMANENT — no undo.` : "Select videos to see cost.";
        runBtn.disabled = false;
      }
      async function runDelete() {
        if (confirmInput.value !== "DELETE") return alert('Type DELETE to confirm.');
        if (!confirm(`Permanently delete ${picker.selected.length} videos? This CANNOT be undone.`)) return;
        const job = await send("RUN_BATCH", { action: "delete", items: picker.selected.map((v) => ({ id: v.id, patch: {} })), costPreview: estimateBatchCost({ delete: picker.selected.length }).units });
        alert(`Done: ${job.done} deleted, ${job.failures.length} failed. Refreshing…`);
        location.reload();
      }
      zone.append(costNote, confirmInput, runBtn);
      void canRunBatch;
    });
  },
};
