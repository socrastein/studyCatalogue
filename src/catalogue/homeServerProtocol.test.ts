/**
 * Tests for the messages between the app and the home server: what they carry, and what they refuse.
 */
import { describe, expect, it } from "vitest";
import { newCatalogue } from "./catalogue";
import {
  numberedCatalogueText,
  readNumberedCatalogue,
  readSaveRequest,
  saveRequestText,
} from "./homeServerProtocol";
import { createStudy } from "./study";
import { exampleStudyDetails } from "./testFixtures";

const catalogue = {
  ...newCatalogue(),
  studies: [createStudy(exampleStudyDetails())],
};

describe("the server's copy", () => {
  it("reads back what was written, revision and catalogue", () => {
    const text = numberedCatalogueText({ revision: 7, catalogue });
    const result = readNumberedCatalogue(JSON.parse(text));
    expect(result).toEqual({
      kind: "valid",
      message: { revision: 7, catalogue },
    });
  });

  it("is refused without a revision", () => {
    const result = readNumberedCatalogue({ catalogue: {} });
    expect(result).toMatchObject({ kind: "invalid" });
  });

  it("is refused for a negative or fractional revision", () => {
    for (const revision of [-1, 1.5, "3"]) {
      const text = numberedCatalogueText({ revision: 0, catalogue });
      const value = { ...JSON.parse(text), revision };
      expect(readNumberedCatalogue(value).kind).toBe("invalid");
    }
  });

  it("is refused when it is not an object", () => {
    expect(readNumberedCatalogue("<!doctype html>").kind).toBe("invalid");
  });
});

describe("a save request", () => {
  it("reads back the base revision and the catalogue", () => {
    const text = saveRequestText({ baseRevision: 3, catalogue });
    const result = readSaveRequest(JSON.parse(text));
    expect(result).toEqual({
      kind: "valid",
      message: { baseRevision: 3, catalogue },
    });
  });

  it("is refused when the catalogue is not valid, saying why", () => {
    const result = readSaveRequest({
      baseRevision: 0,
      catalogue: { schemaVersion: 2, studies: [{}], tags: [] },
    });
    expect(result).toMatchObject({ kind: "invalid" });
    if (result.kind === "invalid") expect(result.problem).toContain("study 1");
  });

  it("is refused when the catalogue is missing", () => {
    expect(readSaveRequest({ baseRevision: 0 }).kind).toBe("invalid");
  });
});
