// src/catalogue/citations/markdownWithSummary.test.ts
import { describe, expect, it } from "vitest";
import { formatMarkdownWithSummary } from "./markdownWithSummary";
import { exampleStudy } from "./citationFixtures";
import type { Study } from "../study";

describe("formatMarkdownWithSummary", () => {
  it("produces a plain-text Markdown link, an empty line, then Summary: and the summary in italics, never in quotes", () => {
    const study: Study = {
      ...exampleStudy(),
      summary: {
        text: "Volume drives hypertrophy.",
        source: "abstract",
        generatedAt: "2026-11-01T00:00:00.000Z",
        approvedAt: null,
      },
    } as Study;

    const result = formatMarkdownWithSummary(study);
    expect(result).not.toBeNull();

    const expectedPlain = `[Schoenfeld et al. (2017)](https://doi.org/10.1080/02640414.2016.1210197)\n\nSummary: *Volume drives hypertrophy.*`;
    expect(result?.plainText).toBe(expectedPlain);
  });

  it("trims surrounding whitespace in the summary", () => {
    const study: Study = {
      ...exampleStudy(),
      summary: {
        text: "   Volume drives hypertrophy.   ",
        source: "abstract",
        generatedAt: "2026-11-01T00:00:00.000Z",
        approvedAt: null,
      },
    } as Study;

    const result = formatMarkdownWithSummary(study);
    expect(result).not.toBeNull();

    const expectedPlain = `[Schoenfeld et al. (2017)](https://doi.org/10.1080/02640414.2016.1210197)\n\nSummary: *Volume drives hypertrophy.*`;
    expect(result?.plainText).toBe(expectedPlain);
  });

  it("produces an HTML version with the summary in <em>, its < and & escaped", () => {
    const study: Study = {
      ...exampleStudy(),
      summary: {
        text: "<Volume & Growth>",
        source: "abstract",
        generatedAt: "2026-11-01T00:00:00.000Z",
        approvedAt: null,
      },
    } as Study;

    const result = formatMarkdownWithSummary(study);
    expect(result).not.toBeNull();

    const escaped = "Summary: <em>&lt;Volume &amp; Growth&gt;</em>";
    const expectedHtml = `<a href="https://doi.org/10.1080/02640414.2016.1210197">Schoenfeld et al. (2017)</a><br><br>${escaped}`;
    expect(result?.html).toBe(expectedHtml);
  });

  it("returns null when there is no summary", () => {
    const result = formatMarkdownWithSummary(exampleStudy());
    expect(result).toBeNull();
  });

  it("returns null when the summary is only whitespace", () => {
    const study: Study = {
      ...exampleStudy(),
      summary: {
        text: "   ",
        source: "abstract",
        generatedAt: "2026-11-01T00:00:00.000Z",
        approvedAt: null,
      },
    } as Study;

    const result = formatMarkdownWithSummary(study);
    expect(result).toBeNull();
  });
});
