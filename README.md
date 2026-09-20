<div align="center">

<img src="src/icons/icon128.png" width="96" alt="T-Manager logo" />

# T-Manager — YouTube Channel Manager

**Batch title/numbering · thumbnails · descriptions · tags · upload queue · analytics · multi-channel — one extension for Chrome, Firefox & Firefox for Android.**

> 🛠️ Made with ❤️ by [**Tasneem Bin Ahsan (TBA)**](https://github.com/tbahsan) — Bangladesh · [@tbahsan](https://x.com/tbahsan) · [@TBAhsan](https://www.youtube.com/@TBAhsan) · [tlogz.com](https://tlogz.com/)

`browser-extension` `youtube` `developer-tools` `manifest-v3` `bangla`

</div>

---

## Why T-Manager?
Renaming 100 videos, re-tagging a series, or uploading a batch on YouTube means clicking one video at a time. T-Manager does it in **one pass — with a preview, a quota cost estimate, and full undo**.

- ✏️ **Batch rename** — 4 modes incl. *prepend* (number beside the original title) · Bangla digits: `শর্ট-১`, `লং-২`
- 🖼️ **Batch thumbnails** — one image for all, per-video mapping, **Shorts 9:16 builder**
- 📝 **Batch description & 🏷️ tags** — replace / append / prepend · merge = one API call (50u, not 150u)
- ⬆️ **Upload queue** — resumable 5 MB chunks; survives network cuts & browser restarts
- 📊 **Analytics dashboard** — views, watch time, CTR, **revenue (RPM)** · 6h cache
- 👥 **Multi-channel** — connect several channels, switch in one click, fully separated data
- ⚡ **Quota tracker** — every action shows its API-unit cost *before* you run it
- ↩️ **Undo everything** (except delete — that one is triple-gated instead)

## Status
🚧 **v0.1.0 — M0 skeleton** (plan milestones M0–M12 → release ≈ mid-Dec 2026). The architecture, build, tests and message protocol are live; features land week by week.

## Dev quickstart
```bash
git clone https://github.com/tbahsan/t-manager && cd t-manager
npm install
npm run build     # → dist/chrome + dist/firefox (load unpacked)
npm test          # vitest
npm run lint      # eslint
```

## Install from zip (no build tools)
1. Download `t-manager-chrome.zip` / `t-manager-firefox.zip` from the [latest release](https://github.com/tbahsan/t-manager/releases/latest) and unzip.
2. Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → select the folder.
3. Firefox: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → `manifest.json`.

Landing page: **https://tbahsan.github.io/t-manager/** (source: `docs/index.html` — deployed via GitHub Pages).

## Releasing
See [docs/RELEASE.md](docs/RELEASE.md) — Pages deploy + tagged release with stable download URLs (`releases/latest/download/t-manager-<browser>.zip`).

## Quota honesty
YouTube gives **10,000 API units/day per project** (an upload costs 1,600). T-Manager shows the cost of every batch before running and never hides this. [docs/QUOTA.md](docs/QUOTA.md) explains how to use **your own** client ID (Pro mode) for your own quota.

## Contributing
PRs welcome — but **readability is a feature**: every file has a header block, every exported function has JSDoc. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License
[MIT](LICENSE) · © 2026 **Tasneem Bin Ahsan (TBA)**. Not affiliated with YouTube/Google. Logo is YouTube-*inspired*, not a copy.
