/**
 * Tests for APA 7 references: author lists of every length, missing publication details, links, and the HTML form.
 */
import { describe, expect, it } from "vitest";
import { formatApa } from "./apa";
import { exampleStudy, numberedAuthors } from "./citationFixtures";

describe("formatApa", () => {
  it("formats a complete journal article", () => {
    expect(formatApa(exampleStudy()).plainText).toBe(
      "Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2017). Dose-response relationship between weekly " +
        "resistance training volume and increases in muscle mass. Journal of Sports Sciences, 35(11), 1073-1082. " +
        "https://doi.org/10.1080/02640414.2016.1210197",
    );
  });

  it("italicizes the journal and volume in the HTML form", () => {
    expect(formatApa(exampleStudy()).html).toContain(
      "<i>Journal of Sports Sciences</i>, <i>35</i>(11), 1073-1082.",
    );
  });

  it("writes a single author without an ampersand", () => {
    const study = exampleStudy({
      authors: [{ family: "Krieger", given: "James W." }],
    });
    expect(formatApa(study).plainText).toMatch(/^Krieger, J\. W\. \(2017\)\. /);
  });

  it("puts a comma and ampersand between two authors", () => {
    const study = exampleStudy({
      authors: [
        { family: "Schoenfeld", given: "Brad Jon" },
        { family: "Ogborn", given: "Dan" },
      ],
    });
    expect(formatApa(study).plainText).toMatch(
      /^Schoenfeld, B\. J\., & Ogborn, D\. \(2017\)/,
    );
  });

  it("lists all 20 authors when there are 20", () => {
    const study = exampleStudy({ authors: numberedAuthors(20) });
    expect(formatApa(study).plainText).toMatch(
      /Author19, A\., & Author20, A\. \(2017\)/,
    );
  });

  it("lists the first 19, an ellipsis, then the last when there are more than 20", () => {
    const study = exampleStudy({ authors: numberedAuthors(25) });
    const reference = formatApa(study).plainText;
    expect(reference).toMatch(/Author19, A\., \. \. \. Author25, A\. \(2017\)/);
    expect(reference).not.toContain("Author20");
  });

  it("writes just the family name for an author with no given name", () => {
    const study = exampleStudy({ authors: [{ family: "WHO", given: "" }] });
    expect(formatApa(study).plainText).toMatch(/^WHO \(2017\)\. /);
  });

  it("does not add a period after a title ending in a question mark", () => {
    const study = exampleStudy({ title: "Does volume matter?" });
    expect(formatApa(study).plainText).toContain(
      "(2017). Does volume matter? Journal",
    );
  });

  it("leaves out the issue and pages when they are missing", () => {
    const study = exampleStudy({ issue: null, pages: null });
    expect(formatApa(study).plainText).toContain(
      "Journal of Sports Sciences, 35. https://doi.org",
    );
  });

  it("leaves out the volume and issue when there is no volume", () => {
    const study = exampleStudy({ volume: null });
    expect(formatApa(study).plainText).toContain(
      "Journal of Sports Sciences, 1073-1082. https://doi.org",
    );
  });

  it("links the URL when there is no DOI", () => {
    const study = exampleStudy({ doi: null, url: "https://example.org/paper" });
    expect(formatApa(study).plainText).toMatch(
      /1073-1082\. https:\/\/example\.org\/paper$/,
    );
  });

  it("ends after the pages when there is neither DOI nor URL", () => {
    const study = exampleStudy({ doi: null, url: null });
    expect(formatApa(study).plainText).toMatch(/1073-1082\.$/);
  });

  it("escapes HTML characters in the HTML form only", () => {
    const study = exampleStudy({ title: "Protein <1.6 g/kg & strength" });
    const citation = formatApa(study);
    expect(citation.plainText).toContain("Protein <1.6 g/kg & strength.");
    expect(citation.html).toContain("Protein &lt;1.6 g/kg &amp; strength.");
  });
});
