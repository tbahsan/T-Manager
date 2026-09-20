/**
 * ═══════════════════════════════════════════════════════
 *  File    : build/build.mjs
 *  Purpose : One codebase → two MV3 bundles.
 *            dist/chrome  (service_worker)
 *            dist/firefox (background.scripts + gecko id)
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 *  Project : T-Manager — github.com/tbahsan/t-manager
 *  Updated : 2026-09-20 (v0.1.0 — M0)
 * ───────────────────────────────────────────────────────
 *  HOW TO READ THIS FILE
 *   §1 — Target matrix (browser-specific manifest extras)
 *   §2 — esbuild bundling + static asset copy
 *  Plan ref: youtube-manager-extension-plan.md §৩, §৫
 * ═══════════════════════════════════════════════════════
 */
import { build } from "esbuild";
import { cpSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)) + "/..";

// ── §1: Target matrix ──────────────────────────────────
// Chrome MV3 registers a service_worker; Firefox MV3 uses
// background.scripts (event page). Everything else identical.
const TARGETS = {
  chrome: {
    background: { service_worker: "background/index.js" },
  },
  firefox: {
    background: { scripts: ["background/index.js"] },
    browser_specific_settings: {
      gecko: { id: "t-manager@tbahsan.dev", strict_min_version: "115.0" },
    },
  },
};

// ── §2: Bundle + copy per target ───────────────────────
mkdirSync(join(ROOT, "dist"), { recursive: true });

for (const [browser, extras] of Object.entries(TARGETS)) {
  const outDir = join(ROOT, "dist", browser);

  await build({
    entryPoints: [
      join(ROOT, "src/background/index.js"),
      join(ROOT, "src/popup/popup.js"),
      join(ROOT, "src/options/options.js"),
    ],
    bundle: true,
    format: "iife", // classic scripts → works as Chrome SW *and* FF background script
    outdir: outDir,
    outbase: join(ROOT, "src"),
    define: { __BROWSER__: JSON.stringify(browser) },
    logLevel: "warning",
    sourcemap: false,
    minify: false, // readability-first (plan §১) — minify only for release zips
  });

  // Static assets (nothing here touches a CDN — offline-safe, plan §১৫)
  cpSync(join(ROOT, "src/popup/popup.html"), join(outDir, "popup/popup.html"));
  cpSync(join(ROOT, "src/popup/popup.css"), join(outDir, "popup/popup.css"));
  cpSync(join(ROOT, "src/options/options.html"), join(outDir, "options/options.html"));
  cpSync(join(ROOT, "src/icons"), join(outDir, "icons"), { recursive: true });

  const base = JSON.parse(readFileSync(join(ROOT, "scripts/manifest.base.json"), "utf8"));
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify({ ...base, ...extras }, null, 2));
  console.log(`✓ dist/${browser} built`);
}
console.log("✓ Load unpacked from dist/chrome or dist/firefox");
