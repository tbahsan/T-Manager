/**
 * File    : src/popup/views/thumbnails.js
 * Purpose : Batch thumbnails — TH1 one-image-all ⭐ / TH2
 *           per-video mapping + client validation (type/size,
 *           §৯.৪). Shorts 9:16 Builder (TH3) lands in M5.
 * Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 */
import { h, requireAuth, targetPicker, progressBar, onEvent } from "../shared/ui.js";
import { estimateBatchCost, canRunBatch } from "../../shared/quota-model.js";

const MAX_BYTES = 2 * 1024 * 1024;
const readFile = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });

export const thumbnails = {
  id: "thumbnails", title: "Thumbs", icon: "🖼️",
  async render(el, { send }) {
    await requireAuth(el, { send }, async () => {
      const { videos } = await send("LIST_VIDEOS", {});
      const state = { selected: [], map: new Map() }; // id → dataUrl
      const pickerMount = h("div", {});
      const mapMount = h("div", {});
      const costNote = h("div", { class: "cost-note" }, "Select videos to see cost.");
      const runBtn = h("button", { class: "btn", disabled: true, onclick: run }, "▶ Run batch");
      const progress = progressBar(0, { onPause: () => send("PAUSE_JOB"), onCancel: () => send("CANCEL_JOB") });

      function validate(dataUrl, name) {
        const head = dataUrl.slice(0, 30).toLowerCase();
        if (!head.startsWith("data:image/")) return `${name}: not an image.`;
        const bytes = Math.ceil((dataUrl.length - head.indexOf(",") - 1) * 0.75);
        if (bytes > MAX_BYTES) return `${name}: over 2 MB (${Math.round(bytes / 1024)} KB).`;
        return null;
      }

      /** TH1: one file → every selected video. */
      const oneInput = h("input", { type: "file", class: "input", accept: "image/*", onchange: async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const dataUrl = await readFile(f);
        const err = validate(dataUrl, f.name);
        if (err) return alert(err);
        state.selected.forEach((v) => state.map.set(v.id, dataUrl));
        renderMap();
      } });

      function renderMap() {
        mapMount.replaceChildren(
          ...state.selected.map((v) => {
            const inp = h("input", { type: "file", class: "input", accept: "image/*", onchange: async (e) => {
              const f = e.target.files[0];
              const dataUrl = await readFile(f);
              const err = validate(dataUrl, f.name);
              if (err) return alert(err);
              state.map.set(v.id, dataUrl);
              renderMap();
            } });
            return h("div", { class: "row-between small", style: { padding: "4px 0" } },
              h("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis" } }, v.title),
              state.map.has(v.id) ? h("img", { src: state.map.get(v.id), style: { width: "42px", height: "24px", objectFit: "cover", borderRadius: "4px" } }) : null,
              inp);
          }),
          state.selected.length ? h("p", { class: "muted small" }, "💡 JPG/PNG/GIF/BMP · max 2 MB · best 1280×720 (16:9); Shorts: 1080×1920 (9:16). Builder for 9:16 lands in M5.") : null,
        );
        const missing = state.selected.filter((v) => !state.map.has(v.id)).length;
        const units = estimateBatchCost({ thumbnails: true, videoCount: state.selected.length }).units;
        costNote.textContent = state.selected.length
          ? `${state.selected.length} thumbnails · ${units} units${missing ? ` · ${missing} missing images` : ""}`
          : "Select videos to see cost.";
        runBtn.disabled = Boolean(missing) || !state.selected.length;
      }

      async function run() {
        const usage = await send("GET_QUOTA");
        const gate = canRunBatch({ units: state.selected.length * 50, usedToday: usage.used });
        if (!gate.ok) return alert(gate.reason);
        if (!confirm(`Replace ${state.selected.length} thumbnails (~${state.selected.length * 50} units)?`)) return;
        runBtn.disabled = true;
        const off = onEvent("JOB_DONE", ({ state: st, done, failures }) => {
          off(); alert(`Batch ${st}: ${done} ok, ${failures.length} failed.`); location.reload();
        });
        await send("RUN_BATCH", {
          action: "thumbnails",
          items: state.selected.map((v) => ({ id: v.id, patch: { dataUrl: state.map.get(v.id) } })),
          costPreview: state.selected.length * 50,
        });
      }

      el.append(
        h("div", { class: "card" }, h("b", {}, "① Target"),
          h("div", { class: "hint" }, "Same picker in every tab — chips select whole groups, or search + tick individual videos."),
          pickerMount),
        h("div", { class: "card" },
          h("b", {}, "② Images"),
          h("div", { class: "hint" }, "TH1 applies ONE image to every selected video (fastest). TH2 lets you pick a DIFFERENT image per video."),
          h("p", { class: "small muted" }, "TH1 — one image for ALL selected:"), oneInput,
          h("p", { class: "small muted", style: { marginTop: "8px" } }, "TH2 — or per-video mapping:"), mapMount,
          costNote),
        runBtn, progress.el,
      );
      targetPicker(pickerMount, videos, (sel) => {
        // keep mappings for still-selected ids only
        const keep = new Set(sel.map((v) => v.id));
        for (const id of [...state.map.keys()]) if (!keep.has(id)) state.map.delete(id);
        state.selected = sel;
        renderMap();
      });
    });
  },
};
