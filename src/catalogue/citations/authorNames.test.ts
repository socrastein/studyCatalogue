/**
 * Tests for author names in citation form: initials from given names, and the short in-text mention.
 */
import { describe, expect, it } from "vitest";
import type { Author } from "../study";
import {
  apaAuthorName,
  filingName,
  fullName,
  givenInitials,
  shortAuthorMention,
} from "./authorNames";

const WHO: Author = { kind: "organization", name: "World Health Organization" };

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
  const schoenfeld: Author = {
    kind: "person",
    family: "Schoenfeld",
    given: "Brad Jon",
  };
  const ogborn: Author = { kind: "person", family: "Ogborn", given: "Dan" };
  const krieger: Author = {
    kind: "person",
    family: "Krieger",
    given: "James W.",
  };

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

describe("names of an organization", () => {
  it("are its whole name, in every form", () => {
    expect(filingName(WHO)).toBe("World Health Organization");
    expect(fullName(WHO)).toBe("World Health Organization");
    expect(apaAuthorName(WHO)).toBe("World Health Organization");
  });

  it("lead a short mention unabbreviated", () => {
    const smith: Author = { kind: "person", family: "Smith", given: "J." };
    expect(shortAuthorMention([WHO, smith])).toBe(
      "World Health Organization & Smith",
    );
  });
});
