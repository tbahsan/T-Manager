# Changelog — keep-a-changelog format

## [Unreleased]
### Changed — UI guide pass (no logic changes)
- Inline instructions beside every option in every tab (target picker, modes, numbering, pre-flight, analytics, undo)
- Rename: custom number style (text before/after number, digits, zero-pad, separator) now applies to ALL modes incl. Prepend — with live per-mode examples
- Description: {existing} placeholder now substitutes the old text (was documented but inert)
- Tooltips on target-picker chips; "How it works" strip on Rename
### Added (M0+M1–M8 first pass, 2026-09-20)
- OAuth login (launchWebAuthFlow) + multi-channel switch/logout, per-account tokens
- Video cache (1u/50 videos; previews & undo cost 0), channel card
- Rename view: 4 modes, per-kind prefixes, Bangla/English digits, live preview, cost gate
- Description & tags views (replace/append/prepend · merge/replace/remove, 500-char guard)
- Thumbnails view (one-for-all + per-video mapping, client validation)
- Upload queue: multi-file, auto-numbered titles, mandatory pre-flight, 1,600u/day gate, resumable 5MB chunks
- Analytics dashboard: totals + top videos + revenue/RPM card, date presets, 6h cache
- Batch runner with pause/cancel/crash-resume + history/undo (batch level)
- Dashboard (stats, quota bar, quick actions, guarded batch delete) + Settings (language, Pro mode client IDs, About)
- GitHub Pages landing page (docs/index.html) + release guide (docs/RELEASE.md)

### Added (M0, 2026-09-20)
- Project skeleton: dual-manifest MV3 build (Chrome service_worker / Firefox background.scripts)
- Message protocol v1 (popup ⇄ background), OAuth module (launchWebAuthFlow, multi-account)
- Shared engines: numbering (Bangla digits), templates, quota cost model — with vitest coverage
- Popup tab shell (9 tabs) + options page + CI (lint/test/build × both targets)
- Logo: "Play Badge on Dark Tile" (Concept A)
