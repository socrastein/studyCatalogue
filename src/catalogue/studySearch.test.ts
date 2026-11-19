/**
 * Tests for the study search: what a study's search text holds, and whether every typed word is in it. These pin the
 * website's rule (title, authors, journal, summary, topic names), so the two sites find the same studies.
 */
import { describe, expect, it } from "vitest";
import { matchesSearch, searchTextOf } from "./studySearch";
import { seedTags } from "./seedTags";
import { createStudy, type Study, type StudyDetails } from "./study";
import { exampleStudyDetails } from "./testFixtures";
import type { Tag } from "./tags";

const TAGS: readonly Tag[] = seedTags();

/** A study built from the example details, with any fields replaced. */
function studyWith(overrides: Partial<StudyDetails>): Study {
  return createStudy(exampleStudyDetails(overrides));
}

/** Whether a study is found by a search typed in the box. */
function isFound(study: Study, typed: string): boolean {
  return matchesSearch(searchTextOf(study, TAGS), typed);
}

describe("matchesSearch", () => {
  it("matches every study for a blank search", () => {
    const study = studyWith({});
    expect(isFound(study, "")).toBe(true);
    expect(isFound(study, "   ")).toBe(true);
  });

  it("requires every typed word, in any order and in any field", () => {
    const study = studyWith({ journal: "Journal of Sports Sciences" });
    expect(isFound(study, "schoenfeld dose")).toBe(true);
    expect(isFound(study, "sports dose")).toBe(true);
    expect(isFound(study, "dose zebrafish")).toBe(false);
  });

  it("ignores case and accents in both the text and the typed words", () => {
    const study = studyWith({
      authors: [{ kind: "person", family: "Côté", given: "Jean" }],
    });
    expect(isFound(study, "cote")).toBe(true);
    expect(isFound(study, "CÔTÉ")).toBe(true);
    expect(isFound(study, "jean COTE")).toBe(true);
  });

  it("splits the typed words on any run of spaces and ignores spaces around them", () => {
    const study = studyWith({});
    expect(isFound(study, "  dose    response  ")).toBe(true);
  });

  it("finds a word inside a longer word", () => {
    const study = studyWith({ title: "Painful knees" });
    expect(isFound(study, "pain")).toBe(true);
  });
});

describe("searchTextOf", () => {
  it("holds the title, the authors' full names and the journal", () => {
    const study = studyWith({});
    expect(isFound(study, "dose-response")).toBe(true);
    expect(isFound(study, "brad jon schoenfeld")).toBe(true);
    expect(isFound(study, "dan ogborn")).toBe(true);
    expect(isFound(study, "sports sciences")).toBe(true);
  });

  it("holds an organization's name as written", () => {
    const study = studyWith({
      authors: [
        { kind: "organization", name: "American College of Sports Medicine" },
      ],
    });
    expect(isFound(study, "american college")).toBe(true);
  });

  it("holds the summary's text once a summary is drafted", () => {
    const study = {
      ...studyWith({}),
      summary: {
        text: "Protein timing made little difference.",
        source: "abstract",
        generatedAt: "2026-11-18T10:00:00.000Z",
        approvedAt: null,
      },
    } as Study;
    expect(isFound(study, "timing little")).toBe(true);
  });

  it("holds the names and the aliases of the study's topics", () => {
    const hypertrophy = TAGS.find(
      (tag) => tag.id === "exercise-science/hypertrophy",
    );
    if (hypertrophy === undefined) {
      throw new Error("The seed topics have no Hypertrophy topic");
    }
    const study = studyWith({ tagIds: [hypertrophy.id] });
    expect(isFound(study, hypertrophy.name)).toBe(true);
    const withAlias: Tag = { ...hypertrophy, aliases: ["muscle growth"] };
    expect(
      matchesSearch(searchTextOf(study, [withAlias]), "muscle growth"),
    ).toBe(true);
  });

  it("holds the abstract and the year", () => {
    const study = studyWith({
      abstract: "A review of zebrafish fins.",
      year: 2017,
    });
    expect(isFound(study, "zebrafish")).toBe(true);
    expect(isFound(study, "2017")).toBe(true);
  });
});
