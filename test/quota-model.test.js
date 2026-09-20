/**
 * File    : test/quota-model.test.js
 * Purpose : Cost math + hard gates — the "5000u for 100 renames"
 *           promise from plan §১ and the 1,600u upload gate §৭.
 * Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 */
import { describe, expect, it } from "vitest";
import { estimateBatchCost, canRunBatch } from "../src/shared/quota-model.js";

describe("estimateBatchCost", () => {
  it("100-video rename = 5,000 units (50u merged call)", () => {
    const { units } = estimateBatchCost({ rename: true, videoCount: 100 });
    expect(units).toBe(5000);
  });
  it("rename + description + tags STILL = 50u/video (merged, not 150u)", () => {
    const { units } = estimateBatchCost({ rename: true, description: true, tags: true, videoCount: 10 });
    expect(units).toBe(500);
  });
  it("7 uploads = 11,200 units (over the daily 10k)", () => {
    const { units } = estimateBatchCost({ upload: 7 });
    expect(units).toBe(11200);
  });
});

describe("canRunBatch", () => {
  it("blocks a batch that exceeds remaining quota", () => {
    const gate = canRunBatch({ units: 11200, usedToday: 0 });
    expect(gate.ok).toBe(false);
    expect(gate.reason).toMatch(/midnight Pacific/);
  });
  it("allows what fits", () => {
    expect(canRunBatch({ units: 5000, usedToday: 2000 }).ok).toBe(true);
  });
});
