/**
 * Tests for reading pasted DOIs, checking their shape, and linking to them.
 */
import { describe, expect, it } from "vitest";
import { doiUrl, isValidDoi, normalizeDoi } from "./doi";

describe("normalizeDoi", () => {
  it.each([
    ["https://doi.org/10.1080/02640414.2016.1210197"],
    ["http://dx.doi.org/10.1080/02640414.2016.1210197"],
    ["doi: 10.1080/02640414.2016.1210197"],
    ["DOI:10.1080/02640414.2016.1210197"],
    ["  10.1080/02640414.2016.1210197  "],
  ])("reduces %j to the bare DOI", (input) => {
    expect(normalizeDoi(input)).toBe("10.1080/02640414.2016.1210197");
  });

  it("is null for blank input, so an empty field is stored as no DOI", () => {
    expect(normalizeDoi("   ")).toBeNull();
  });
});

describe("isValidDoi", () => {
  it("accepts a DOI with a dotted registrant and a suffix containing slashes and dots", () => {
    expect(isValidDoi("10.1000.10/abc/def.5")).toBe(true);
  });

  it("rejects a URL, which must be normalized first", () => {
    expect(isValidDoi("https://doi.org/10.1000/abc")).toBe(false);
  });

  it("rejects a registrant shorter than four digits", () => {
    expect(isValidDoi("10.123/abc")).toBe(false);
  });

  it("rejects a DOI with no suffix", () => {
    expect(isValidDoi("10.1000/")).toBe(false);
  });
});

describe("doiUrl", () => {
  it("links through doi.org over HTTPS", () => {
    expect(doiUrl("10.1000/abc")).toBe("https://doi.org/10.1000/abc");
  });
});
