/**
 * ═══════════════════════════════════════════════════════
 *  File    : src/popup/views/analytics.js
 *  Purpose : Analytics dashboard (§৯.৭) — resilient version.
 *            Queries are SPLIT so one unsupported metric can
 *            never blank the whole tab:
 *              Q_CORE  views/watch-time/subs      (always works)
 *              Q_THUMB impressions + CTR           (traffic-gated)
 *              Q_REV   revenue + RPM               (YPP channels)
 *              Q_TOP   top videos (revenue column degrades gracefully)
 *            Each failed query hides only its own cards and shows
 *            Google's real message (background now forwards it).
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 * ═══════════════════════════════════════════════════════
 */
import { h, requireAuth } from "../shared/ui.js";

const Q_CORE = "views,estimatedMinutesWatched,subscribersGained,subscribersLost";
const Q_THUMB = "impressions,clickThroughRate";
const Q_REV = "views,estimatedRevenue";

const PRESETS = { "7": 7, "28": 28, "90": 90 };
const iso = (d) => d.toISOString().slice(0, 10);
const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
const money = (n) => `$${Number(n ?? 0).toFixed(2)}`;

export const analytics = {
  id: "analytics", title: "Analytics", icon: "📊",
  async render(el, { send }) {
    await requireAuth(el, { send }, async () => {
      const preset = h("select", { class: "input", onchange: () => load() },
        ...Object.keys(PRESETS).map((p) => h("option", { value: p }, `Last ${p} days`)));
      const mount = h("div", {}, h("p", { class: "muted" }, "Loading…"));
      el.append(h("div", { class: "card" }, h("b", {}, "📊 Channel analytics"),
        h("div", { class: "hint" }, "Ranges end 3 days back — YouTube reports lag 2–3 days. A new query costs ≈1 unit; results are cached 6 hours (free afterwards)."),
        preset), mount);

      /** Runs one analytics query → {rows, cols} or {error}. */
      async function q(metrics, extra = {}) {
        const days = PRESETS[preset.value];
        const end = new Date(); end.setDate(end.getDate() - 3);
        const start = new Date(end); start.setDate(end.getDate() - days);
        try {
          const rep = await send("ANALYTICS_QUERY", { metrics, startDate: iso(start), endDate: iso(end), ...extra });
          return { rows: rep.rows ?? [], cols: rep.columnHeaders.map((c) => c.name) };
        } catch (e) {
          return { error: e.message };
        }
      }
      const col = (rep, name) => rep.cols.indexOf(name);
      const total = (rep, name) => rep.rows.reduce((a, r) => a + Number(r[col(rep, name)] ?? 0), 0);
      const stat = (label, value) => h("div", { class: "stat" }, h("b", {}, value), h("span", {}, label));

      async function load() {
        mount.replaceChildren(h("p", { class: "muted" }, "Loading…"));

        const [core, thumb, rev, top] = await Promise.all([
          q(Q_CORE, { dimensions: "day" }),
          q(Q_THUMB, { dimensions: "day" }),
          q(Q_REV, { dimensions: "day" }),
          q(Q_REV, { dimensions: "video", sort: "-views", maxResults: 10 }),
        ]);

        const cards = [];
        const notes = [];

        // ── Core (never fails silently) ──
        if (core.error) {
          notes.push(`Core metrics error: ${core.error}`);
        } else {
          const views = total(core, "views");
          const watchH = total(core, "estimatedMinutesWatched") / 60;
          const subs = total(core, "subscribersGained") - total(core, "subscribersLost");
          cards.push(
            stat("Views", fmt(views)),
            stat("Watch time", `${watchH.toFixed(1)}h`),
            stat("Subscribers", `${subs >= 0 ? "+" : ""}${fmt(subs)}`),
          );

          // ── Thumbnails (may be unavailable for low-traffic channels) ──
          if (thumb.error) {
            notes.push(`Impressions/CTR unavailable: ${thumb.error}`);
          } else {
            const imp = total(thumb, "impressions");
            const clicks = thumb.rows.reduce((a, r) => a + (Number(r[col(thumb, "impressions")] ?? 0) * Number(r[col(thumb, "clickThroughRate")] ?? 0)) / 100, 0);
            cards.push(
              stat("Impressions", fmt(imp)),
              stat("CTR (approx)", imp ? `${((clicks / imp) * 100).toFixed(1)}%` : "—"),
            );
          }

          // ── Revenue (monetized channels) ──
          if (rev.error) {
            cards.push(stat("Revenue (est.)", "—"), stat("RPM /1k views", "—"));
            notes.push(`Revenue unavailable: ${rev.error}`);
          } else {
            const revenue = total(rev, "estimatedRevenue");
            const rViews = total(rev, "views") || views;
            cards.push(
              stat("Revenue (est.)", money(revenue)),
              stat("RPM /1k views", money(rViews ? (revenue / rViews) * 1000 : 0)),
            );
            if (revenue === 0) notes.push("Revenue stays $0 until your channel joins the YouTube Partner Program (monetization).");
          }

          // ── Top videos table ──
          let topRep = top, revenueCol = true;
          if (top.error) {
            // retry with views only (revenue column is the usual culprit)
            topRep = await q(Q_CORE.split(",").slice(0, 1).join(","), { dimensions: "video", sort: "-views", maxResults: 10 });
            revenueCol = false;
          }
          if (topRep.error) {
            notes.push(`Top videos error: ${topRep.error}`);
          } else {
            const { videos } = await send("LIST_VIDEOS", {});
            const titles = new Map(videos.map((v) => [v.id, v.title]));
            const rows = topRep.rows.slice(0, 10).map((r) => {
              const id = r[col(topRep, "video")];
              const cells = [h("td", { style: { maxWidth: "170px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, titles.get(id) ?? id),
                h("td", {}, fmt(r[col(topRep, "views")]))];
              if (revenueCol) cells.push(h("td", {}, money(r[col(topRep, "estimatedRevenue")])));
              return h("tr", {}, cells);
            });
            mount.replaceChildren(
              h("div", { class: "grid2" }, cards),
              h("div", { class: "card" }, h("b", {}, "Top videos"),
                h("table", { class: "preview" },
                  h("tbody", {},
                    h("tr", {},
                      h("td", { class: "muted" }, "Video"), h("td", { class: "muted" }, "Views"),
                      ...(revenueCol ? [h("td", { class: "muted" }, "Revenue")] : [])),
                    ...rows))),
              ...notes.map((n) => h("p", { class: "muted small" }, `ℹ️ ${n}`)),
              h("p", { class: "muted small" }, "Data via YouTube Analytics API (separate quota pool, ~1u/query, 6h cache)."),
            );
            return;
          }
        }

        // Fallback: total failure → show what we know
        mount.replaceChildren(
          h("div", { class: "grid2" }, cards),
          ...notes.map((n) => h("p", { class: "muted small" }, `ℹ️ ${n}`)),
        );
      }
      load();
    });
  },
};
