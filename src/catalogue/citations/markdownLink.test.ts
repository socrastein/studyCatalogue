/**
 * Tests for the Reddit markdown link: its text, its target, and the characters that would break the markdown.
 */
import { describe, expect, it } from "vitest";
import { exampleStudy } from "./citationFixtures";
import { formatMarkdownLink } from "./markdownLink";

describe("formatMarkdownLink", () => {
  it("links the short mention to the DOI", () => {
    expect(formatMarkdownLink(exampleStudy()).plainText).toBe(
      "[Schoenfeld et al. (2017)](https://doi.org/10.1080/02640414.2016.1210197)",
    );
  });

  it("gives the same link as an HTML anchor", () => {
    expect(formatMarkdownLink(exampleStudy()).html).toBe(
      '<a href="https://doi.org/10.1080/02640414.2016.1210197">Schoenfeld et al. (2017)</a>',
    );
  });

  it("links the URL when there is no DOI", () => {
    const study = exampleStudy({ doi: null, url: "https://example.org/paper" });
    expect(formatMarkdownLink(study).plainText).toBe(
      "[Schoenfeld et al. (2017)](https://example.org/paper)",
    );
  });

  it("is the mention alone when there is no link", () => {
    const study = exampleStudy({ doi: null, url: null });
    expect(formatMarkdownLink(study).plainText).toBe(
      "Schoenfeld et al. (2017)",
    );
  });

  it("percent-encodes parentheses in the target, which would end a Reddit link early", () => {
    const study = exampleStudy({ doi: "10.1016/S0140-6736(20)30183-5" });
    expect(formatMarkdownLink(study).plainText).toContain(
      "(https://doi.org/10.1016/S0140-6736%2820%2930183-5)",
    );
  });

  it("escapes square brackets in the link text", () => {
    const study = exampleStudy({
      authors: [{ kind: "person", family: "[Collaborators]", given: "" }],
    });
    expect(formatMarkdownLink(study).plainText).toMatch(
      /^\[\\\[Collaborators\\\] \(2017\)\]/,
    );
  });
});
