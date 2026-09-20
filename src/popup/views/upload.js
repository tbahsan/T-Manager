/**
 * File    : src/popup/views/upload.js
 * Purpose : Upload queue (§৯.৫) — multi-file, auto-numbered
 *           titles, MANDATORY pre-flight confirm (privacy +
 *           made-for-kids — user-confirmed decision, §২১),
 *           1,600u/day hard gate, resumable 5 MB chunks.
 * Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 */
import { h, requireAuth } from "../shared/ui.js";
import { getSettings, saveSettings } from "../../shared/settings.js";
import { QUOTA } from "../../shared/constants.js";

const CHUNK = QUOTA.UPLOAD_CHUNK_BYTES; // 5 MB
const bufferToB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

export const upload = {
  id: "upload", title: "Upload", icon: "⬆️",
  async render(el, { send }) {
    await requireAuth(el, { send }, async () => {
      const settings = await getSettings();
      const usage = await send("GET_QUOTA");
      const files = []; // {file, title}
      const seq = 1;

      const rowsEl = h("div", {});
      const prefix = h("input", { class: "input", value: settings.rename?.prefixShort ?? "ভিডিও", oninput: retitle });
      const digitsSel = h("select", { class: "input", onchange: retitle },
        h("option", { value: "bn" }, "১২৩ (Bangla)"), h("option", { value: "en" }, "123 (English)"));
      digitsSel.value = settings.rename?.digits ?? "bn";
      const privacy = h("select", { class: "input" },
        ...["private", "unlisted", "public"].map((p) => h("option", { value: p }, p)));
      privacy.value = settings.upload?.privacy ?? "unlisted";
      const mfkYes = h("input", { type: "radio", name: "mfk" });
      const mfkNo = h("input", { type: "radio", name: "mfk" });
      (settings.upload?.madeForKids ? mfkYes : mfkNo).checked = true;
      const confirmChk = h("input", { type: "checkbox" });
      const gate = h("div", { class: "cost-note" }, "—");
      const startBtn = h("button", { class: "btn", disabled: true, onclick: startUploads }, "🚀 Start upload queue");
      const statusEl = h("div", { class: "card", hidden: true }, h("b", {}, "Progress"), h("div", { class: "muted small", style: { marginTop: "6px" } }));

      const BN = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
      const num = (n) => digitsSel.value === "bn" ? String(n).replace(/\d/g, (d) => BN[+d]) : String(n);

      function retitle() { files.forEach((f, i) => { f.title = `${prefix.value}-${num(seq + i)}`; f.row.querySelector("b").textContent = f.title; }); }
      function refreshGate() {
        const affordable = Math.max(0, Math.min(files.length, Math.floor((usage.limit - usage.used) / 1600)));
        gate.textContent = `${files.length} file(s) · ${files.length * 1600} units · daily quota allows ${affordable} upload(s) right now.`
          + (affordable < files.length ? " ⚠️ rest will fail — upload fewer or wait for reset." : "");
        startBtn.disabled = !files.length || !confirmChk.checked || affordable === 0;
        return affordable;
      }
      confirmChk.addEventListener("change", refreshGate);

      function addFiles(list) {
        for (const f of list) {
          const row = h("div", { class: "row-between small", style: { padding: "4px 0" } },
            h("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis" } }, h("b", {}, ""), h("span", { class: "muted" }, ` ${f.name} · ${(f.size / 1048576).toFixed(1)} MB`)));
          files.push({ file: f, title: "", row });
          rowsEl.append(row);
        }
        retitle();
        refreshGate();
      }

      async function startUploads() {
        const affordable = refreshGate();
        if (!affordable) return;
        // persist last-used pre-flight values (pre-filled next time)
        await saveSettings("upload", { privacy: privacy.value, madeForKids: mfkYes.checked });

        startBtn.disabled = true;
        const status = statusEl.querySelector("div");
        let ok = 0;
        for (const f of files.slice(0, affordable)) {
          try {
            status.textContent = `⬆️ ${f.title}: opening session…`;
            const item = await send("UPLOAD_INIT", { meta: { title: f.title, privacy: privacy.value, madeForKids: mfkYes.checked, totalBytes: f.file.size } });
            let next = 0;
            let out = null;
            while (next < f.file.size) {
              const end = Math.min(next + CHUNK, f.file.size);
              const b64 = bufferToB64(await f.file.slice(next, end).arrayBuffer());
              out = await send("UPLOAD_CHUNK", { uploadId: item.uploadId, dataB64: b64 });
              next = out.nextByte;
              status.textContent = `⬆️ ${f.title}: ${Math.round((next / f.file.size) * 100)}%`;
              if (out.done) break;
            }
            ok++;
            status.textContent = `✅ ${f.title} uploaded${out?.videoId ? ` (id ${out.videoId})` : ""}`;
          } catch (err) {
            status.textContent = `⛔ ${f.title}: ${err.message}`;
            break; // stop queue on error — user can retry (session persisted)
          }
        }
        alert(`Uploaded ${ok}/${Math.min(files.length, affordable)}. Quota used: ${ok * 1600} units.\nRefresh the dashboard (🔄 Sync) to see them.`);
        location.reload();
      }

      el.append(
        h("div", { class: "card" },
          h("b", {}, "① Files"),
          h("div", { class: "hint" }, "Pick several videos at once — each gets an auto-numbered title using the style below."),
          h("input", { type: "file", class: "input", multiple: true, accept: "video/*", onchange: (e) => addFiles([...e.target.files]) }),
          rowsEl,
          h("div", { class: "grid2" },
            h("div", {}, h("span", { class: "small" }, "Title prefix (auto-number)"), prefix),
            h("div", {}, h("span", { class: "small" }, "Digits"), digitsSel))),
          h("div", { class: "hint" }, "Each file gets prefix-১, prefix-২… in order — e.g. prefix “শর্ট” → শর্ট-১, শর্ট-২…"),
        h("div", { class: "card" },
          h("b", {}, "② Pre-flight — required every batch"),
          h("div", { class: "hint" }, "YouTube requires privacy + made-for-kids on every upload. Asking each batch means nothing ever goes public by accident."),
          h("span", { class: "small" }, "Privacy"), privacy,
          h("div", {}, h("label", {}, mfkNo, " Not made for kids"), "  ", h("label", {}, mfkYes, " Made for kids")),
          h("label", { class: "small" }, confirmChk, " I confirm privacy & made-for-kids for this batch"),
          gate),
        startBtn, statusEl,
      );
    });
  },
};
