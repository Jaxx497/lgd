import { describe, expect, it } from "vitest";
import { isNewer } from "../src/update";

describe("isNewer", () => {
  it("compares numerically, not as text", () => {
    expect(isNewer("v1.2.10", "1.2.9")).toBe(true);
    expect(isNewer("1.3.0", "1.2.9")).toBe(true);
    expect(isNewer("1.2.2", "1.2.2")).toBe(false);
    expect(isNewer("1.2.1", "1.2.2")).toBe(false);
    expect(isNewer("nightly", "1.2.2")).toBe(false);
  });
});
