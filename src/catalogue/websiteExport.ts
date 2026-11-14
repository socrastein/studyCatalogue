/**
 * The catalogue as the public site may see it: the "Export for the Website" file. The catalogue is private, so this is
 * built as an explicit allow-list: every exported field is named here, one by one, and nothing else is copied. A field
 * added to `Study` later (a private note, say) is therefore never published until someone adds it here on purpose.
 * Never spread a study or an author into the export.
 *
 * What is left out, on purpose: the publisher's abstract (the site shows Matt's approved summary in its place),
 * summaries that are still drafts, and the app's own bookkeeping (created and edited times, tag aliases).
 */
import type { Catalogue } from "./catalogue";
import type { Author, Study } from "./study";
import type { StudySummary } from "./summary";
import type { Tag } from "./tags";

/** The version of this file's format, for the site's reader to check. Raise it when the shape changes. */
export const WEBSITE_EXPORT_VERSION = 1;

/** The part of a summary the site shows: its words, and whether they came from the abstract or the full text. */
export type WebsiteSummary = Pick<StudySummary, "text" | "source">;

/** One study as the site gets it. `summary` is present only for an approved summary. */
export type WebsiteStudy = Pick<
  Study,
  | "id"
  | "title"
  | "authors"
  | "year"
  | "journal"
  | "volume"
  | "issue"
  | "pages"
  | "doi"
  | "url"
  | "tagIds"
  | "design"
  | "subjects"
  | "ageGroups"
  | "trainingStatuses"
  | "sexes"
> & { summary?: WebsiteSummary };

/** One tag as the site gets it: enough to name it and place it in the hierarchy. */
export type WebsiteTag = Pick<Tag, "id" | "name" | "parentIds">;

export type WebsiteExport = {
  exportVersion: typeof WEBSITE_EXPORT_VERSION;
  /** ISO 8601 timestamp of when the file was made. */
  exportedAt: string;
  tags: WebsiteTag[];
  studies: WebsiteStudy[];
};

/**
 * The export for the site, built from the catalogue.
 *
 * @param catalogue The whole catalogue.
 * @param now When the export is made; the current time unless a test fixes it.
 */
export function buildWebsiteExport(
  catalogue: Catalogue,
  now = new Date(),
): WebsiteExport {
  return {
    exportVersion: WEBSITE_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    tags: catalogue.tags.map(exportTag),
    studies: catalogue.studies.map(exportStudy),
  };
}

/**
 * The export as the text of the file: JSON, indented so a change between two exports reads in a diff.
 *
 * @param catalogue The whole catalogue.
 * @param now When the export is made; the current time unless a test fixes it.
 */
export function serializeWebsiteExport(
  catalogue: Catalogue,
  now = new Date(),
): string {
  return JSON.stringify(buildWebsiteExport(catalogue, now), null, 2);
}

/** How many of the studies carry an approved summary, so Settings can say what the file will hold. */
export function countApprovedSummaries(studies: readonly Study[]): number {
  return studies.filter((study) => approvedSummaryOf(study) !== undefined)
    .length;
}

function exportTag(tag: Tag): WebsiteTag {
  return { id: tag.id, name: tag.name, parentIds: [...tag.parentIds] };
}

function exportStudy(study: Study): WebsiteStudy {
  const summary = approvedSummaryOf(study);
  return {
    id: study.id,
    title: study.title,
    authors: study.authors.map(exportAuthor),
    year: study.year,
    journal: study.journal,
    volume: study.volume,
    issue: study.issue,
    pages: study.pages,
    doi: study.doi,
    url: study.url,
    tagIds: [...study.tagIds],
    design: study.design,
    subjects: study.subjects,
    ageGroups: [...study.ageGroups],
    trainingStatuses: [...study.trainingStatuses],
    sexes: [...study.sexes],
    ...(summary === undefined ? {} : { summary }),
  };
}

/** An author's own fields: a person's names, or an organization's name. */
function exportAuthor(author: Author): Author {
  if (author.kind === "organization")
    return { kind: "organization", name: author.name };
  return { kind: "person", family: author.family, given: author.given };
}

/** The study's summary as the site gets it, only once approved: a draft is Matt's to review, not the public's. */
function approvedSummaryOf(study: Study): WebsiteSummary | undefined {
  const summary = study.summary;
  if (summary === undefined || summary.approvedAt === null) return undefined;
  return { text: summary.text, source: summary.source };
}
