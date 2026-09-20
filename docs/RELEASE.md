# Release & GitHub Pages Guide — T-Manager

> by [Tasneem Bin Ahsan (TBA)](https://github.com/tbahsan)

## A. Publish the landing page (GitHub Pages)
1. Push this repo to `github.com/tbahsan/t-manager` (branch: `main`).
2. GitHub → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, Folder: **`/docs`** → Save.
3. In ~1 minute the site lives at `https://tbahsan.github.io/t-manager/` — it's `docs/index.html`, fully self-contained (no external assets).

## B. Publish a release (the download links)
The landing page buttons point to **stable asset URLs**:
```
https://github.com/tbahsan/t-manager/releases/latest/download/t-manager-chrome.zip
https://github.com/tbahsan/t-manager/releases/latest/download/t-manager-firefox.zip
```
So every release MUST attach zips with exactly those names:

```bash
# 1. Bump version in package.json + scripts/manifest.base.json, then:
npm run build

# 2. Zip the built extensions (zip the CONTENTS of dist/<browser>)
cd dist/chrome  && zip -r ../../t-manager-chrome.zip  . && cd ..
cd dist/firefox && zip -r ../../t-manager-firefox.zip . && cd ..

# 3. Tag + release
git tag v0.1.0 && git push origin main --tags
gh release create v0.1.0 t-manager-chrome.zip t-manager-firefox.zip \
   --title "v0.1.0 — dev preview" --notes "First public build. See README."
```
(No `gh` CLI? Releases → *Draft a new release* → attach both zips manually — same names, lowercase, exact.)

## C. Update the landing page
Edit `docs/index.html` (self-contained: inline CSS + embedded logo) → commit → Pages redeploys automatically.

## D. Later: store listings
When v1.0 ships (~Dec 2026), submit the same zips to Chrome Web Store + Firefox AMO (desktop + Android), then swap the hero buttons for store badges — keep the zip links as fallback.
