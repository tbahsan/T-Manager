/**
 * File    : test/numbering.test.js
 * Purpose : Bangla/English digit engine — plan §৯.১ core promise.
 * Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 */
import { describe, expect, it } from "vitest";
import { toBanglaDigits, toEnglishDigits, formatNumber, generateSequence } from "../src/shared/numbering.js";

describe("numbering", () => {
  it("converts EN digits to Bangla", () => {
    expect(toBanglaDigits("123")).toBe("১২৩");
  });
  it("converts Bangla digits back to EN", () => {
    expect(toEnglishDigits("শর্ট-৩")).toBe("শর্ট-3");
  });
  it("zero-pads before digit conversion", () => {
    expect(formatNumber(7, { digits: "bn", pad: 2 })).toBe("০৭");
  });
  it("steps through a sequence", () => {
    expect(generateSequence({ start: 1, step: 2, count: 3, digits: "bn" })).toEqual(["১", "৩", "৫"]);
  });
});
