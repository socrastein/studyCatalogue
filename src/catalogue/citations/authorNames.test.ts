/**
 * Tests for author names in citation form: initials from given names, and the short in-text mention.
 */
import { describe, expect, it } from "vitest";
import { givenInitials, shortAuthorMention } from "./authorNames";

describe("givenInitials", () => {
  it.each([
    ["Brad Jon", "B. J."],
    ["James W.", "J. W."],
    ["B. J.", "B. J."],
    ["B.J.", "B. J."],
    ["BJ", "B. J."],
    ["Jean-Paul", "J.-P."],
    ["Dan", "D."],
    ["", ""],
  ])("turns %j into %j", (given, expected) => {
    expect(givenInitials(given)).toBe(expected);
  });
});

describe("shortAuthorMention", () => {
  const schoenfeld = { family: "Schoenfeld", given: "Brad Jon" };
  const ogborn = { family: "Ogborn", given: "Dan" };
  const krieger = { family: "Krieger", given: "James W." };

  it("is the family name for one author", () => {
    expect(shortAuthorMention([schoenfeld])).toBe("Schoenfeld");
  });

  it("joins two authors with an ampersand", () => {
    expect(shortAuthorMention([schoenfeld, ogborn])).toBe(
      "Schoenfeld & Ogborn",
    );
  });

  it("is the first author et al. for three or more", () => {
    expect(shortAuthorMention([schoenfeld, ogborn, krieger])).toBe(
      "Schoenfeld et al.",
    );
  });
});
