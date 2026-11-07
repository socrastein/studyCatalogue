/**
 * Tests for the study list's sort orders, including how each breaks ties.
 */
import { describe, expect, it } from "vitest";
import { isSortOrder, sortStudies } from "./sortStudies";
import type { Author, Study } from "./study";
import { exampleStudyDetails } from "./testFixtures";

type StudyShape = {
  title: string;
  year: number;
  createdAt?: string;
  authors?: Author[];
};

/** A saved study with just the fields the sort orders read; created on New Year's Day by J. Smith unless given. */
function study({
  title,
  year,
  createdAt = "2026-01-01T00:00:00.000Z",
  authors = [{ family: "Smith", given: "J." }],
}: StudyShape): Study {
  return {
    ...exampleStudyDetails({ title, year, authors }),
    id: title,
    createdAt,
    updatedAt: createdAt,
  };
}

/** A study whose first author has the given family name. */
function writtenBy(family: string, title: string, year: number): Study {
  return study({ title, year, authors: [{ family, given: "J." }] });
}

/** The titles of the studies in the given order. */
function titlesIn(order: Parameters<typeof sortStudies>[1], studies: Study[]) {
  return sortStudies(studies, order).map(({ title }) => title);
}

describe("sortStudies", () => {
  const studies = [
    study({
      title: "B 2019",
      year: 2019,
      createdAt: "2026-03-01T00:00:00.000Z",
    }),
    study({
      title: "A 2021",
      year: 2021,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    study({
      title: "C 2019",
      year: 2019,
      createdAt: "2026-02-01T00:00:00.000Z",
    }),
  ];

  it("puts the newest publications first, then by title", () => {
    expect(titlesIn("newest", studies)).toEqual(["A 2021", "B 2019", "C 2019"]);
  });

  it("puts the oldest publications first, then by title", () => {
    expect(titlesIn("oldest", studies)).toEqual(["B 2019", "C 2019", "A 2021"]);
  });

  it("puts the most recently entered first", () => {
    expect(titlesIn("added", studies)).toEqual(["B 2019", "C 2019", "A 2021"]);
  });

  it("orders by first author ignoring case, one author's studies oldest first, as APA does", () => {
    const byAuthors = [
      writtenBy("krieger", "Krieger later", 2020),
      writtenBy("Schoenfeld", "Schoenfeld", 2017),
      writtenBy("Krieger", "Krieger earlier", 2010),
    ];
    expect(titlesIn("author", byAuthors)).toEqual([
      "Krieger earlier",
      "Krieger later",
      "Schoenfeld",
    ]);
  });

  it("puts a study without authors last when sorting by author", () => {
    const studiesWithMissingAuthor = [
      study({ title: "No authors", year: 2020, authors: [] }),
      study({ title: "Has authors", year: 2020 }),
    ];
    expect(titlesIn("author", studiesWithMissingAuthor)).toEqual([
      "Has authors",
      "No authors",
    ]);
  });

  it("does not change the list it is given", () => {
    const original = [...studies];
    sortStudies(studies, "oldest");
    expect(studies).toEqual(original);
  });
});

describe("isSortOrder", () => {
  it("accepts the sort order ids and nothing else", () => {
    expect(isSortOrder("author")).toBe(true);
    expect(isSortOrder("random")).toBe(false);
  });
});
