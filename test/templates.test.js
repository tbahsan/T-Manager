/**
 * File    : test/templates.test.js
 * Purpose : Template engine — placeholders, Bangla numbering,
 *           100-char truncation, unknown-token errors (plan §১১).
 * Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 */
import { describe, expect, it } from "vitest";
import { renderTemplate, TemplateError } from "../src/shared/templates.js";

describe("renderTemplate", () => {
  it("renders the flagship example", () => {
    expect(renderTemplate("{prefix}-{n}", { prefix: "শর্ট", n: "৩" }).text).toBe("শর্ট-৩");
  });
  it("keeps the original title in prepend mode", () => {
    expect(renderTemplate("{n}. {title}", { n: "৩", title: "আজকের খবর" }).text).toBe("৩. আজকের খবর");
  });
  it("formats {date}", () => {
    expect(renderTemplate("{date} — {title}", { date: "2026-09-20T10:00:00Z", title: "x" }).text).toBe("2026-09-20 — x");
  });
  it("truncates at 100 chars and says so", () => {
    const out = renderTemplate("{title}", { title: "x".repeat(120) });
    expect(out.text.length).toBe(100);
    expect(out.truncated).toBe(true);
  });
  it("rejects unknown placeholders (typo safety)", () => {
    expect(() => renderTemplate("{tittel}", {})).toThrow(TemplateError);
  });
});
