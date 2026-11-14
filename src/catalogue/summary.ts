/**
 * A study's summary: a short plain-language text that replaces the publisher's abstract on the public site, written as a
 * draft (by a language model) and published only once Matt has approved it. This module holds the summary's type and the
 * changes that can be made to it; each returns a new study and stamps `updatedAt`, because the backup merge decides
 * which copy of a study is newer by that stamp (see backupMerge.ts).
 */
import type { Study } from "./study";

/** Where a draft was written from: the paper's abstract, or its full text. A full-text summary is the better one. */
export const SUMMARY_SOURCES = ["abstract", "fullText"] as const;
export type SummarySource = (typeof SUMMARY_SOURCES)[number];

export type StudySummary = {
  text: string;
  source: SummarySource;
  /** ISO 8601 timestamp of when the draft was written. */
  generatedAt: string;
  /** ISO 8601 timestamp of Matt's approval; null while it is a draft. Only approved summaries leave the app. */
  approvedAt: string | null;
};

/**
 * A new draft, not yet approved.
 *
 * @param text The summary's words.
 * @param source What it was written from.
 * @param now When it was written; the current time unless a test fixes it.
 */
export function createDraftSummary(
  text: string,
  source: SummarySource,
  now = new Date(),
): StudySummary {
  return { text, source, generatedAt: now.toISOString(), approvedAt: null };
}

/** Whether the study has a summary that is waiting for Matt's approval. */
export function isAwaitingReview(study: Study): boolean {
  return study.summary !== undefined && study.summary.approvedAt === null;
}

/**
 * The studies whose drafts wait for review, in the catalogue's order.
 *
 * @param studies Every study.
 */
export function studiesAwaitingReview(studies: readonly Study[]): Study[] {
  return studies.filter(isAwaitingReview);
}

/**
 * The study with a summary put on it, replacing any it had (a new draft replaces an approved summary as well, and is
 * itself unapproved: the approval was of the old words).
 *
 * @param study The study as saved.
 * @param summary The summary to put on it.
 * @param now The time of the change; the current time unless a test fixes it.
 */
export function withSummary(
  study: Study,
  summary: StudySummary,
  now = new Date(),
): Study {
  return { ...study, summary, updatedAt: now.toISOString() };
}

/**
 * The study with its draft approved. A study without a summary, or with one already approved, is returned unchanged.
 *
 * @param study The study as saved.
 * @param now The time of approval; the current time unless a test fixes it.
 */
export function approveSummary(study: Study, now = new Date()): Study {
  if (study.summary === undefined || study.summary.approvedAt !== null)
    return study;
  const timestamp = now.toISOString();
  const summary = { ...study.summary, approvedAt: timestamp };
  return { ...study, summary, updatedAt: timestamp };
}

/**
 * The study with the summary's words changed. A draft stays a draft; an approved summary stays approved, since the
 * words are then Matt's own (he wrote them over, or fixed them, in the editor). A study without a summary is returned
 * unchanged.
 *
 * @param study The study as saved.
 * @param text The new words.
 * @param now The time of the edit; the current time unless a test fixes it.
 */
export function editSummaryText(
  study: Study,
  text: string,
  now = new Date(),
): Study {
  if (study.summary === undefined) return study;
  const summary = { ...study.summary, text };
  return { ...study, summary, updatedAt: now.toISOString() };
}

/**
 * The study without its summary: rejecting a draft deletes it. The abstract and everything else are untouched.
 *
 * @param study The study as saved.
 * @param now The time of the change; the current time unless a test fixes it.
 */
export function rejectSummary(study: Study, now = new Date()): Study {
  const { summary: _removed, ...rest } = study;
  return { ...rest, updatedAt: now.toISOString() };
}
