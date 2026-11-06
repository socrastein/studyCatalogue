/**
 * Tests for forgiving text comparison: case, spaces and accents.
 */
import { describe, expect, it } from "vitest";
import { containsFolded, foldForMatching } from "./textMatching";

describe("foldForMatching", () => {
  it("trims, lowercases and removes accents", () => {
    expect(foldForMatching("  Müller Ñandú ")).toBe("muller nandu");
  });
});

describe("containsFolded", () => {
  it("finds the query regardless of case and accents", () => {
    expect(containsFolded("Effects of café au lait", "CAFE")).toBe(true);
  });

  it("treats an empty query as matching everything", () => {
    expect(containsFolded("anything", "  ")).toBe(true);
  });

  it("is false when the text does not contain the query", () => {
    expect(containsFolded("Protein", "creatine")).toBe(false);
  });
});
