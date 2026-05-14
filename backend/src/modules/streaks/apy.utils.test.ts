import { describe, it, expect } from "vitest";
import { computeApy } from "./apy.utils.js";

describe("computeApy", () => {
  it("returns 4.0 for streak 0", () => {
    expect(computeApy(0)).toBe(4.0);
  });

  it("returns 5.0 at the 1-week tier", () => {
    expect(computeApy(1)).toBe(5.0);
  });

  it("returns 5.5 at the 2-week tier", () => {
    expect(computeApy(2)).toBe(5.5);
    expect(computeApy(3)).toBe(5.5);
  });

  it("returns 6.0 at the 4-week tier", () => {
    expect(computeApy(4)).toBe(6.0);
    expect(computeApy(5)).toBe(6.0);
  });

  it("returns 6.5 at the 6-week tier", () => {
    expect(computeApy(6)).toBe(6.5);
    expect(computeApy(7)).toBe(6.5);
  });

  it("returns 7.0 at the 8-week tier", () => {
    expect(computeApy(8)).toBe(7.0);
    expect(computeApy(11)).toBe(7.0);
  });

  it("returns 7.5 at the 12-week tier", () => {
    expect(computeApy(12)).toBe(7.5);
    expect(computeApy(15)).toBe(7.5);
  });

  it("returns 8.0 at the 16-week tier", () => {
    expect(computeApy(16)).toBe(8.0);
    expect(computeApy(100)).toBe(8.0);
  });

  it("returns 4.0 for negative streak", () => {
    expect(computeApy(-5)).toBe(4.0);
  });
});
