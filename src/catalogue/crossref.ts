/**
 * Reading a Crossref record (https://api.crossref.org/works/<doi>) into the study form's publication fields, so a
 * study can be filled in from its DOI. Crossref is the registry most journals file their DOIs with; its records are
 * not always complete, so every field is optional and only what is present gets filled in.
 *
 * Fetching the record is done elsewhere (components/lookUpDoi.ts); this module only reads one.
 */
import { formatAuthorList } from "./authorList";
import type { Author } from "./study";
import type { StudyDraft } from "./studyDraft";

/** The publication fields a Crossref record can provide, as the study form's text. Absent when the record lacks it. */
export type CrossrefFields = Partial<
  Pick<
    StudyDraft,
    | "title"
    | "authors"
    | "year"
    | "journal"
    | "volume"
    | "issue"
    | "pages"
    | "abstract"
  >
>;

/** How each field is named when announcing what was filled in, in the order the form shows them. */
const FIELD_NAMES: Record<keyof CrossrefFields, string> = {
  title: "title",
  authors: "authors",
  year: "year",
  journal: "journal",
  volume: "volume",
  issue: "issue",
  pages: "pages",
  abstract: "abstract",
};

/**
 * The publication fields in a Crossref work record.
 *
 * The year is the print issue's when there is one, since APA cites the issue a paper appeared in, and otherwise the
 * online publication's. HTML and JATS markup in the title and abstract is removed.
 *
 * @param message The record's "message" object, as Crossref's JSON has it; anything else gives no fields.
 */
export function crossrefFields(message: unknown): CrossrefFields {
  if (typeof message !== "object" || message === null) return {};
  const record = message as Record<string, unknown>;
  const fields: CrossrefFields = {
    title: crossrefTitle(record),
    authors: crossrefAuthors(record.author),
    year: crossrefYear(record),
    journal: firstText(record["container-title"]),
    volume: plainText(record.volume),
    issue: plainText(record.issue),
    pages: plainText(record.page) ?? plainText(record["article-number"]),
    abstract: crossrefAbstract(record.abstract),
  };
  return withoutMissing(fields);
}

/**
 * The names of the fields a lookup found, in the order the form shows them, for announcing what was filled in:
 * e.g. ["title", "authors", "year"].
 *
 * @param fields What the lookup found.
 */
export function filledFieldNames(fields: CrossrefFields): string[] {
  const keys = Object.keys(FIELD_NAMES) as (keyof CrossrefFields)[];
  const foundKeys = keys.filter((key) => fields[key] !== undefined);
  return foundKeys.map((key) => FIELD_NAMES[key]);
}

/** The title, with its subtitle after a colon when Crossref keeps it separately. */
function crossrefTitle(record: Record<string, unknown>): string | undefined {
  const title = firstText(record.title);
  const subtitle = firstText(record.subtitle);
  if (title === undefined || subtitle === undefined) return title;
  return `${title}: ${subtitle}`;
}

/**
 * The authors in the form the Authors box reads ("Schoenfeld, Brad J.; Ogborn, Dan"). An organization listed as
 * an author has only a name, which becomes the family name.
 */
function crossrefAuthors(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const authors = value
    .map(crossrefAuthor)
    .filter((author) => author !== undefined);
  return authors.length === 0 ? undefined : formatAuthorList(authors);
}

/** One Crossref author entry as an author. */
function crossrefAuthor(entry: unknown): Author | undefined {
  if (typeof entry !== "object" || entry === null) return undefined;
  const fields = entry as Record<string, unknown>;
  const family = plainText(fields.family) ?? plainText(fields.name);
  if (family === undefined) return undefined;
  return { family, given: plainText(fields.given) ?? "" };
}

/** The year as text: the print issue's when known, otherwise the online publication's, otherwise the issue date's. */
function crossrefYear(record: Record<string, unknown>): string | undefined {
  const dates = [
    record["published-print"],
    record["published-online"],
    record.issued,
  ];
  const years = dates.map(yearOfDate).filter((year) => year !== undefined);
  return years[0];
}

/** The year in a Crossref date ({"date-parts": [[2017, 6, 3]]}). */
function yearOfDate(date: unknown): string | undefined {
  if (typeof date !== "object" || date === null) return undefined;
  const dateParts = (date as Record<string, unknown>)["date-parts"];
  // A list holding one [year, month, day] list, with month and day optional
  const firstDate: unknown = Array.isArray(dateParts)
    ? dateParts[0]
    : undefined;
  const year: unknown = Array.isArray(firstDate) ? firstDate[0] : undefined;
  return typeof year === "number" ? String(year) : undefined;
}

/** The abstract as plain paragraphs: JATS tags removed, and a leading "Abstract" heading dropped. */
function crossrefAbstract(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const paragraphs = value.replace(/<\/jats:p>/g, "\n\n");
  const text = withoutMarkup(paragraphs).replace(/^\s*Abstract\s*/i, "");
  return text === "" ? undefined : text;
}

/** The first string of a Crossref list field (title and journal come as one-item lists), cleaned of markup. */
function firstText(value: unknown): string | undefined {
  return Array.isArray(value) ? plainText(value[0]) : undefined;
}

/** A text or number field as clean text; undefined when missing or blank. */
function plainText(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = withoutMarkup(String(value));
  return text === "" ? undefined : text;
}

/** Text with HTML or XML tags removed, entities decoded and whitespace tidied. */
function withoutMarkup(text: string): string {
  const withoutTags = text.replace(/<[^>]+>/g, "");
  return tidyWhitespace(decodeEntities(withoutTags));
}

/** The text with the HTML entities Crossref uses turned back into characters ("&amp;" into "&"). */
function decodeEntities(text: string): string {
  return (
    text
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"')
      .replaceAll("&#39;", "'")
      // Last, so "&amp;lt;" becomes the text "&lt;" rather than "<"
      .replaceAll("&amp;", "&")
  );
}

/** The text with runs of spaces collapsed, spaces around line breaks removed, and at most one blank line in a row. */
function tidyWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The fields without the ones that are undefined, so spreading them over a draft only replaces what was found. */
function withoutMissing(fields: CrossrefFields): CrossrefFields {
  const present = Object.entries(fields).filter(
    ([, value]) => value !== undefined,
  );
  return Object.fromEntries(present) as CrossrefFields;
}
