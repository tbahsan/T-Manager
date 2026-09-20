/**
 * File    : test/storage.test.js
 * Purpose : Regression — update() on an ABSENT key must pass
 *           `undefined` to the mutator (not null), so default
 *           params like (list = []) work. This was the crash on
 *           the very first login ("null (reading 'filter')").
 * Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 */
import { describe, expect, it, vi } from "vitest";

const { store } = vi.hoisted(() => ({ store: new Map() }));

vi.mock("webextension-polyfill", () => ({
  default: {
    storage: {
      local: {
        async get(key) { return store.has(key) ? { [key]: store.get(key) } : {}; },
        async set(obj) { for (const [k, v] of Object.entries(obj)) store.set(k, v); },
        async remove(keys) { (Array.isArray(keys) ? keys : [keys]).forEach((k) => store.delete(k)); },
      },
    },
  },
}));

import { get, set, update } from "../src/shared/storage.js";

describe("storage.update (first-write regression)", () => {
  it("absent key → mutator gets undefined, default [] kicks in", async () => {
    const next = await update("yt.accounts", (list = []) => [...list, { id: "chan-1" }]);
    expect(next).toEqual([{ id: "chan-1" }]);
  });
  it("second write → mutator receives the stored value", async () => {
    await update("yt.accounts", (list = []) => [...list, { id: "chan-2" }]);
    expect(await get("yt.accounts")).toHaveLength(2);
  });
  it("stored null behaves like absent", async () => {
    await set("some.key", null);
    expect(await update("some.key", (v = 0) => v + 1)).toBe(1);
  });
});
