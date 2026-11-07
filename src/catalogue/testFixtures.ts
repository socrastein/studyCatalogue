/**
 * Example data for unit tests: a complete, valid study, which each test changes only where it matters.
 */
import type { StudyDetails } from "./study";

/**
 * The details of a real-looking study (Schoenfeld et al. 2017, a hypertrophy meta-analysis), with any fields
 * replaced by `overrides`.
 */
export function exampleStudyDetails(
  overrides: Partial<StudyDetails> = {},
): StudyDetails {
  return {
    title:
      "Dose-response relationship between weekly resistance training volume and increases in muscle mass",
    authors: [
      { kind: "person", family: "Schoenfeld", given: "Brad Jon" },
      { kind: "person", family: "Ogborn", given: "Dan" },
      { kind: "person", family: "Krieger", given: "James W." },
    ],
    year: 2017,
    journal: "Journal of Sports Sciences",
    volume: "35",
    issue: "11",
    pages: "1073-1082",
    doi: "10.1080/02640414.2016.1210197",
    url: null,
    abstract: "The purpose of this paper was to systematically review...",
    tagIds: ["exercise-science/hypertrophy"],
    design: "meta-analysis",
    subjects: "humans",
    ageGroups: ["young-adults"],
    trainingStatuses: ["untrained", "trained"],
    sexes: ["male"],
    ...overrides,
  };
}
