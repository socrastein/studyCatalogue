/**
 * A study: its bibliographic details (what a citation needs), its topic tags, and its facets (see facets.ts). The
 * catalogue stores studies as plain, read-only data: an edit replaces the study rather than changing it. This module
 * creates and updates them.
 */
import type {
  AgeGroupId,
  SexId,
  StudyDesignId,
  SubjectsId,
  TrainingStatusId,
} from "./facets";
import { createId } from "./ids";

/**
 * One author, split the way citation styles need. `given` is kept as entered: full given names ("Brad Jon") or
 * initials ("B. J."); the citation formatters derive initials where a style wants them.
 */
export type Author = { family: string; given: string };

/** Everything about a study that is entered in the form: the study minus its id and timestamps. */
export type StudyDetails = {
  title: string;
  /** In the order the paper lists them; never empty in a saved study. */
  authors: readonly Author[];
  year: number;
  journal: string;
  volume: string | null;
  issue: string | null;
  /** As printed, e.g. "1073-1082" or an article number such as "e12345". */
  pages: string | null;
  /** The bare DOI, e.g. "10.1519/JSC.0000000000002345" (see doi.ts). */
  doi: string | null;
  /** A link to the paper for studies without a DOI, or a free full-text copy. */
  url: string | null;
  abstract: string;
  tagIds: readonly string[];
  design: StudyDesignId;
  subjects: SubjectsId;
  /** Empty when the study does not report it; several when it compares groups. */
  ageGroups: readonly AgeGroupId[];
  /** Empty when the study does not report it; several when it compares groups. */
  trainingStatuses: readonly TrainingStatusId[];
  /** Empty when not reported; both for a mixed sample. */
  sexes: readonly SexId[];
};

export type Study = StudyDetails & {
  id: string;
  /** ISO 8601 timestamp, e.g. "2026-11-06T22:45:54.000Z". */
  createdAt: string;
  /** ISO 8601 timestamp of the last edit; equal to `createdAt` until the study is edited. */
  updatedAt: string;
};

/**
 * A new study with a fresh id, created and last updated now.
 *
 * @param details What was entered in the form.
 * @param now The creation time; the current time unless a test fixes it.
 * @returns The study, ready to add to the catalogue.
 */
export function createStudy(details: StudyDetails, now = new Date()): Study {
  const timestamp = now.toISOString();
  return {
    ...details,
    id: createId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * The study with its details replaced by edited ones, keeping its id and creation time.
 *
 * @param study The study as saved.
 * @param details The edited details, complete (not just the changed fields).
 * @param now The time of the edit; the current time unless a test fixes it.
 * @returns A new study object; the original is not changed.
 */
export function updateStudy(
  study: Study,
  details: StudyDetails,
  now = new Date(),
): Study {
  return {
    ...details,
    id: study.id,
    createdAt: study.createdAt,
    updatedAt: now.toISOString(),
  };
}
