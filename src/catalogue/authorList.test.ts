/**
 * Tests for reading pasted author lists in every accepted form, and writing them back for editing.
 */
import { describe, expect, it } from "vitest";
import { formatAuthorList, hasEtAl, parseAuthorList } from "./authorList";

/** The authors as "Family | Given" strings, which read clearly in a failing test. */
function read(text: string): string[] {
  return parseAuthorList(text).map(
    (author) => `${author.family} | ${author.given}`,
  );
}

const SCHOENFELD_ET_AL = ["Schoenfeld | BJ", "Ogborn | D", "Krieger | JW"];

describe("parseAuthorList", () => {
  it("reads PubMed's form, family name then packed initials", () => {
    expect(read("Schoenfeld BJ, Ogborn D, Krieger JW.")).toEqual(
      SCHOENFELD_ET_AL,
    );
  });

  it("reads a reference list's form, joining each family name with the initials after it", () => {
    expect(read("Schoenfeld, B. J., Ogborn, D., & Krieger, J. W.")).toEqual([
      "Schoenfeld | B. J.",
      "Ogborn | D.",
      "Krieger | J. W.",
    ]);
  });

  it("reads a journal page's form, given names first, with 'and' before the last", () => {
    expect(
      read("Brad Jon Schoenfeld, Dan Ogborn and James W. Krieger"),
    ).toEqual(["Schoenfeld | Brad Jon", "Ogborn | Dan", "Krieger | James W."]);
  });

  it("reads initials written before the family name", () => {
    expect(read("J. W. Krieger, B.J. Schoenfeld")).toEqual([
      "Krieger | J. W.",
      "Schoenfeld | B.J.",
    ]);
  });

  it("reads one author per line, or semicolon-separated, inverted or not", () => {
    expect(read("Schoenfeld, Brad Jon\nDan Ogborn\nKrieger JW")).toEqual([
      "Schoenfeld | Brad Jon",
      "Ogborn | Dan",
      "Krieger | JW",
    ]);
    expect(read("Schoenfeld, Brad Jon; Ogborn, Dan")).toEqual([
      "Schoenfeld | Brad Jon",
      "Ogborn | Dan",
    ]);
  });

  it("keeps name particles with the family name", () => {
    expect(read("Ludwig van Beethoven, Maria de la Cruz")).toEqual([
      "van Beethoven | Ludwig",
      "de la Cruz | Maria",
    ]);
  });

  it("keeps hyphenated initials together", () => {
    expect(read("Dupont J.-P., Smith A")).toEqual([
      "Dupont | J.-P.",
      "Smith | A",
    ]);
  });

  it("reads a lone family name as an author with no given name", () => {
    expect(read("Schoenfeld")).toEqual(["Schoenfeld | "]);
  });

  it("is empty for blank text", () => {
    expect(parseAuthorList("  \n ")).toEqual([]);
  });
});

describe("hasEtAl", () => {
  it.each(["Johnson et al.", "Johnson et al", "Johnson, et. al."])(
    "spots %j",
    (text) => {
      expect(hasEtAl(text)).toBe(true);
    },
  );

  it("does not mistake a name containing those letters", () => {
    expect(hasEtAl("Etalon B, Metal C")).toBe(false);
  });
});

describe("formatAuthorList", () => {
  it("writes inverted names separated by semicolons, which read back unchanged", () => {
    const authors = [
      { family: "Schoenfeld", given: "Brad Jon" },
      { family: "van Beethoven", given: "L." },
      { family: "WHO", given: "" },
    ];
    const text = formatAuthorList(authors);
    expect(text).toBe("Schoenfeld, Brad Jon; van Beethoven, L.; WHO");
    expect(parseAuthorList(text)).toEqual(authors);
  });
});
