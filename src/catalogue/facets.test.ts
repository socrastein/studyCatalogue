/**
 * Tests for the facet vocabularies and checking an id against one.
 */
import { describe, expect, it } from "vitest";
import { AGE_GROUPS, isFacetId, STUDY_DESIGNS } from "./facets";

describe("isFacetId", () => {
  it("accepts an id from the vocabulary", () => {
    expect(isFacetId(STUDY_DESIGNS, "cohort")).toBe(true);
  });

  it("rejects a label, which is for display and never stored", () => {
    expect(isFacetId(STUDY_DESIGNS, "Cohort study")).toBe(false);
  });

  it("rejects an id from a different facet", () => {
    expect(isFacetId(AGE_GROUPS, "cohort")).toBe(false);
  });
});

describe("the vocabularies", () => {
  it("have no duplicate ids within a facet", () => {
    const ids = STUDY_DESIGNS.map((design) => design.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
