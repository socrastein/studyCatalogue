/**
 * Tests for MLA 9 works-cited entries: author lists, missing publication details, pages, links, and the HTML form.
 */
import { describe, expect, it } from "vitest";
import { exampleStudy } from "./citationFixtures";
import { formatMla } from "./mla";

describe("formatMla", () => {
  it("formats a complete journal article with three or more authors as et al.", () => {
    expect(formatMla(exampleStudy()).plainText).toBe(
      'Schoenfeld, Brad Jon, et al. "Dose-response relationship between weekly resistance training volume and ' +
        'increases in muscle mass." Journal of Sports Sciences, vol. 35, no. 11, 2017, pp. 1073-1082, ' +
        "https://doi.org/10.1080/02640414.2016.1210197.",
    );
  });

  it("italicizes the journal in the HTML form", () => {
    expect(formatMla(exampleStudy()).html).toContain(
      "<i>Journal of Sports Sciences</i>, vol. 35",
    );
  });

  it("writes one author inverted, without doubling a period after an initial", () => {
    const study = exampleStudy({
      authors: [{ family: "Krieger", given: "James W." }],
    });
    expect(formatMla(study).plainText).toMatch(/^Krieger, James W\. "/);
  });

  it("writes the second of two authors in direct order", () => {
    const study = exampleStudy({
      authors: [
        { family: "Schoenfeld", given: "Brad Jon" },
        { family: "Ogborn", given: "Dan" },
      ],
    });
    expect(formatMla(study).plainText).toMatch(
      /^Schoenfeld, Brad Jon, and Dan Ogborn\. "/,
    );
  });

  it("keeps a title's question mark inside the quotes, with no added period", () => {
    const study = exampleStudy({ title: "Does volume matter?" });
    expect(formatMla(study).plainText).toContain(
      '"Does volume matter?" Journal',
    );
  });

  it('uses "p." for a single page or article number', () => {
    const study = exampleStudy({ pages: "e12345" });
    expect(formatMla(study).plainText).toContain("2017, p. e12345, https://");
  });

  it("leaves out volume, issue and pages when they are missing", () => {
    const study = exampleStudy({ volume: null, issue: null, pages: null });
    expect(formatMla(study).plainText).toContain(
      "Journal of Sports Sciences, 2017, https://doi.org",
    );
  });

  it("ends with the year when there is no link either", () => {
    const study = exampleStudy({
      volume: null,
      issue: null,
      pages: null,
      doi: null,
      url: null,
    });
    expect(formatMla(study).plainText).toMatch(
      /Journal of Sports Sciences, 2017\.$/,
    );
  });
});
