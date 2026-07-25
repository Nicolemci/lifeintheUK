import { describe, expect, it } from "vitest";
import { findClosestTestCentres, testCentres } from "./testCentres";

describe("test centre helpers", () => {
  it("returns five centres ordered by distance", () => {
    const nearby = findClosestTestCentres(51.5074, -0.1278);

    expect(nearby).toHaveLength(5);
    expect(nearby.every((centre, index) => index === 0 || centre.distanceMiles >= nearby[index - 1].distanceMiles)).toBe(true);
  });

  it("finds the local city centre when searching near it", () => {
    const nearby = findClosestTestCentres(53.4808, -2.2426);

    expect(nearby[0].city).toBe("Manchester");
    expect(nearby[0].distanceMiles).toBe(0);
  });

  it("has enough nationwide locations to provide alternatives", () => {
    expect(testCentres.length).toBeGreaterThan(30);
  });
});
