# Contributing to T-Manager

> Maintained by [Tasneem Bin Ahsan (TBA)](https://github.com/tbahsan)

## The one rule
**A new developer must understand any file in minutes — from its comments, not from guessing.** This project's brand is readable code (plan §১৩). PRs that skip this get sent back, nicely.

## Checklist (every PR)
- [ ] File header block: `File / Purpose / Author / Project / Updated` + `HOW TO READ THIS FILE` map
- [ ] Long files: `§n` section banners
- [ ] Every exported function: JSDoc with an `Example:` line
- [ ] Code comments in **English**; user-facing strings via `src/shared/i18n/` (English default, বাংলা toggle)
- [ ] Pure logic (numbering, templates, quota math) lives in `src/shared/` and has vitest cases
- [ ] `npm run lint && npm test && npm run build` all green

## Workflow
1. Issue first (or comment "I'll take this"), then a focused PR.
2. Branch names: `feat/m5-thumbnail-builder`, `fix/oauth-expiry`.
3. Keep-a-changelog entries under `CHANGELOG.md` → Unreleased.
