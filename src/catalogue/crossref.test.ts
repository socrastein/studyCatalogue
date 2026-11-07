/**
 * Tests for reading Crossref records into the study form: a real record's fields, the year rule, organizations as
 * authors, markup in titles and abstracts, and records missing fields.
 */
import { describe, expect, it } from "vitest";
import { parseAuthorList } from "./authorList";
import { crossrefFields, filledFieldNames } from "./crossref";

/** The record for Schoenfeld, Ogborn & Krieger (2017), trimmed to the fields read, as Crossref returned it. */
const SCHOENFELD_2017 = {
  title: [
    "Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis",
  ],
  author: [
    { given: "Brad J.", family: "Schoenfeld", sequence: "first" },
    { given: "Dan", family: "Ogborn", sequence: "additional" },
    { given: "James W.", family: "Krieger", sequence: "additional" },
  ],
  "container-title": ["Journal of Sports Sciences"],
  volume: "35",
  issue: "11",
  page: "1073-1082",
  "published-print": { "date-parts": [[2017, 6, 3]] },
  "published-online": { "date-parts": [[2016, 7, 19]] },
  issued: { "date-parts": [[2016, 7, 19]] },
};

describe("crossrefFields", () => {
  it("reads every publication field of a complete record", () => {
    expect(crossrefFields(SCHOENFELD_2017)).toEqual({
      title: SCHOENFELD_2017.title[0],
      authors: "Schoenfeld, Brad J.; Ogborn, Dan; Krieger, James W.",
      year: "2017",
      journal: "Journal of Sports Sciences",
      volume: "35",
      issue: "11",
      pages: "1073-1082",
    });
  });

  it("writes authors in a form the Authors box reads back exactly", () => {
    const authors = crossrefFields(SCHOENFELD_2017).authors ?? "";
    expect(parseAuthorList(authors)).toEqual([
      { kind: "person", family: "Schoenfeld", given: "Brad J." },
      { kind: "person", family: "Ogborn", given: "Dan" },
      { kind: "person", family: "Krieger", given: "James W." },
    ]);
  });

  it("uses the online year when there is no print issue yet", () => {
    const record = { ...SCHOENFELD_2017, "published-print": undefined };
    expect(crossrefFields(record).year).toBe("2016");
  });

  it("uses an organization's name as its family name", () => {
    const record = {
      ...SCHOENFELD_2017,
      author: [{ name: "WHO", sequence: "first" }],
    };
    expect(crossrefFields(record).authors).toBe("WHO");
  });

  it("joins a separate subtitle and removes markup and entities from the title", () => {
    const record = {
      ...SCHOENFELD_2017,
      title: ["Effects of <i>whey</i> &amp; casein"],
      subtitle: ["A trial"],
    };
    expect(crossrefFields(record).title).toBe(
      "Effects of whey & casein: A trial",
    );
  });

  it("turns a JATS abstract into plain paragraphs without its heading", () => {
    const abstract =
      "<jats:title>Abstract</jats:title><jats:p>First   paragraph.</jats:p>\n<jats:p>Second &lt;5%.</jats:p>";
    expect(crossrefFields({ ...SCHOENFELD_2017, abstract }).abstract).toBe(
      "First paragraph.\n\nSecond <5%.",
    );
  });

  it("uses the article number when there are no page numbers", () => {
    const record = {
      ...SCHOENFELD_2017,
      page: undefined,
      "article-number": "e12345",
    };
    expect(crossrefFields(record).pages).toBe("e12345");
  });

  it("leaves out whatever the record lacks", () => {
    expect(crossrefFields({ title: ["Only a title"] })).toEqual({
      title: "Only a title",
    });
  });

  it("gives nothing for something that is not a record", () => {
    expect(crossrefFields(null)).toEqual({});
  });
});

describe("filledFieldNames", () => {
  it("names the found fields in the order the form shows them", () => {
    expect(filledFieldNames({ year: "2017", title: "New title" })).toEqual([
      "title",
      "year",
    ]);
  });
});
