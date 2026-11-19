/**
 * Tests for finding studies: search words, tags with their descendants, facets (OR within, AND across), and the
 * count of studies left out for not reporting a filtered population facet.
 */
import { describe, expect, it } from "vitest";
import {
  emptyFilters,
  filterStudies,
  hasActiveFilters,
  type StudyFilters,
} from "./filterStudies";
import { seedTags } from "./seedTags";
import { createStudy, type Study, type StudyDetails } from "./study";
import { exampleStudyDetails } from "./testFixtures";

const TAGS = seedTags();

/** A study with a recognizable title and any details replaced. */
function study(title: string, overrides: Partial<StudyDetails> = {}): Study {
  return createStudy(exampleStudyDetails({ title, ...overrides }));
}

const STUDIES = [
  study("Volume in trained men", {
    tagIds: ["exercise-science/hypertrophy"],
    design: "meta-analysis",
    trainingStatuses: ["trained"],
    ageGroups: ["young-adults"],
  }),
  study("Knee pain in older adults", {
    tagIds: ["exercise-science/pain-injury"],
    design: "randomized-controlled-trial",
    trainingStatuses: ["untrained"],
    ageGroups: ["older-adults"],
    abstract: "Résumé of joint outcomes",
  }),
  study("Protein timing", {
    tagIds: ["nutrition/protein", "exercise-science/hypertrophy"],
    design: "randomized-controlled-trial",
    trainingStatuses: [],
    ageGroups: [],
  }),
  study("Rat muscle", {
    tagIds: ["exercise-science/hypertrophy"],
    design: "randomized-controlled-trial",
    subjects: "animals",
    trainingStatuses: [],
    ageGroups: [],
  }),
];

/** The titles of the studies matching the given filters. */
function titlesMatching(changes: Partial<StudyFilters>): string[] {
  const filters = { ...emptyFilters(), ...changes };
  return filterStudies(STUDIES, TAGS, filters).matches.map(
    (match) => match.title,
  );
}

describe("filterStudies", () => {
  it("matches every study with no filters set", () => {
    expect(titlesMatching({})).toHaveLength(4);
  });

  it("combines a tag, a training status and a design (the hypertrophy-in-trained-lifters search)", () => {
    expect(
      titlesMatching({
        tagIds: ["exercise-science/hypertrophy"],
        trainingStatuses: ["trained"],
        designs: ["meta-analysis"],
      }),
    ).toEqual(["Volume in trained men"]);
  });

  it("matches studies tagged beneath a chosen tag", () => {
    expect(titlesMatching({ tagIds: ["nutrition"] })).toEqual([
      "Protein timing",
    ]);
  });

  it("requires every chosen tag", () => {
    expect(
      titlesMatching({ tagIds: ["nutrition", "exercise-science/hypertrophy"] }),
    ).toEqual(["Protein timing"]);
  });

  it("matches any chosen value within one facet", () => {
    expect(
      titlesMatching({ ageGroups: ["young-adults", "older-adults"] }),
    ).toEqual(["Volume in trained men", "Knee pain in older adults"]);
  });

  it("filters by subjects", () => {
    expect(titlesMatching({ subjects: ["animals"] })).toEqual(["Rat muscle"]);
  });

  it("searches every word anywhere: title, abstract, authors and tag names, ignoring case and accents", () => {
    expect(titlesMatching({ query: "older RESUME" })).toEqual([
      "Knee pain in older adults",
    ]);
    expect(titlesMatching({ query: "protein schoenfeld" })).toEqual([
      "Protein timing",
    ]);
    expect(titlesMatching({ query: "injury" })).toEqual([
      "Knee pain in older adults",
    ]);
  });

  it("searches the publication year, so an author and year narrow to one paper", () => {
    const papers = [
      study("Spine loading", { year: 2021 }),
      study("Spine posture", { year: 2018 }),
    ];
    const filters = { ...emptyFilters(), query: "spine 2021" };
    const titles = filterStudies(papers, TAGS, filters).matches.map(
      (match) => match.title,
    );
    expect(titles).toEqual(["Spine loading"]);
  });

  it("leaves out studies that do not report a filtered population facet, and counts them", () => {
    const filters = {
      ...emptyFilters(),
      trainingStatuses: ["trained" as const],
    };
    const result = filterStudies(STUDIES, TAGS, filters);
    expect(result.matches.map((match) => match.title)).toEqual([
      "Volume in trained men",
    ]);
    expect(result.unreportedCounts).toEqual({ trainingStatuses: 2 });
  });

  it("counts unreported studies only among those matching the other filters", () => {
    const filters: StudyFilters = {
      ...emptyFilters(),
      ageGroups: ["older-adults"],
      subjects: ["humans"],
    };
    expect(filterStudies(STUDIES, TAGS, filters).unreportedCounts).toEqual({
      ageGroups: 1,
    });
  });
});

describe("hasActiveFilters", () => {
  it("is false for empty filters and a blank query", () => {
    expect(hasActiveFilters({ ...emptyFilters(), query: "  " })).toBe(false);
  });

  it("is true when anything is chosen", () => {
    expect(hasActiveFilters({ ...emptyFilters(), sexes: ["female"] })).toBe(
      true,
    );
  });
});
