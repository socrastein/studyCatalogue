/**
 * Example studies for the citation tests: the shared example study, saved, with any details replaced.
 */
import {
  createStudy,
  type Author,
  type Study,
  type StudyDetails,
} from "../study";
import { exampleStudyDetails } from "../testFixtures";

/**
 * The example study (Schoenfeld, Ogborn & Krieger 2017), with any details replaced.
 */
export function exampleStudy(overrides: Partial<StudyDetails> = {}): Study {
  return createStudy(exampleStudyDetails(overrides));
}

/**
 * A list of numbered authors, "Author1, A." to "AuthorN, A.", for testing the long-list rules.
 */
export function numberedAuthors(count: number): Author[] {
  return Array.from({ length: count }, (_, index) => ({
    family: `Author${index + 1}`,
    given: "A",
  }));
}
