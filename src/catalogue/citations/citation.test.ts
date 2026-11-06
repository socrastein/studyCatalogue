/**
 * Tests for the shared citation pieces: rendering segments, escaping HTML, closing punctuation and the preferred link.
 */
import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  italic,
  plain,
  renderCitation,
  studyLink,
  withClosingPeriod,
} from "./citation";
import { exampleStudy } from "./citationFixtures";

describe("renderCitation", () => {
  it("joins segments as plain text and wraps italic ones in <i> for HTML", () => {
    const citation = renderCitation([
      plain("In "),
      italic("Nature"),
      plain("."),
    ]);
    expect(citation).toEqual({
      plainText: "In Nature.",
      html: "In <i>Nature</i>.",
    });
  });

  it("skips empty segments, so no empty <i></i> appears", () => {
    expect(renderCitation([plain("A"), italic(""), plain("B")]).html).toBe(
      "AB",
    );
  });
});

describe("escapeHtml", () => {
  it("escapes the characters HTML treats as markup", () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;",
    );
  });
});

describe("withClosingPeriod", () => {
  it.each([
    ["A title", "A title."],
    ["A title.", "A title."],
    ["Does it work?", "Does it work?"],
    ["It works!", "It works!"],
  ])("turns %j into %j", (text, expected) => {
    expect(withClosingPeriod(text)).toBe(expected);
  });
});

describe("studyLink", () => {
  it("prefers the DOI link over the URL", () => {
    const study = exampleStudy({ url: "https://example.org/paper" });
    expect(studyLink(study)).toBe(
      "https://doi.org/10.1080/02640414.2016.1210197",
    );
  });

  it("is null with neither a DOI nor a URL", () => {
    expect(studyLink(exampleStudy({ doi: null, url: null }))).toBeNull();
  });
});
