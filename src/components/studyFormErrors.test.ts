/**
 * Tests for placing validation messages: which element each links to, and their order.
 */
import { describe, expect, it } from "vitest";
import { errorSummaryItems, fieldElementId } from "./studyFormErrors";

describe("fieldElementId", () => {
  it.each([
    ["title", "study-title"],
    ["authors.2.family", "author-2-family"],
    ["design", "study-design-meta-analysis"],
    ["subjects", "study-subjects-humans"],
  ])("points %j at #%s", (field, elementId) => {
    expect(fieldElementId(field)).toBe(elementId);
  });
});

describe("errorSummaryItems", () => {
  it("lists messages in the order the fields appear on the page", () => {
    const items = errorSummaryItems({
      design: "Choose the study design.",
      "authors.3.family": "Third row",
      title: "Enter the study's title.",
      "authors.1.family": "First row",
      year: "Enter the year it was published.",
    });
    expect(items.map((item) => item.message)).toEqual([
      "Enter the study's title.",
      "First row",
      "Third row",
      "Enter the year it was published.",
      "Choose the study design.",
    ]);
  });
});
