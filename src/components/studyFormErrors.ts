/**
 * Where each validation message belongs in the study form: which element a message's error summary link points to,
 * and the order messages are listed in (the order of the fields on the page).
 */
import type { DraftErrors } from "../catalogue/studyDraft";

/** One line of the error summary: the message, and the id of the field it links to. */
export type SummaryItem = { fieldId: string; message: string };

/** The fields that can have a message, top to bottom as the form shows them. */
const FIELD_ORDER = [
  "title",
  "authors",
  "year",
  "journal",
  "doi",
  "url",
  "design",
  "subjects",
];

/**
 * The error summary's lines for a set of messages, in the order the fields appear on the page.
 *
 * @param errors The messages from `validateDraft`, by field name.
 */
export function errorSummaryItems(errors: DraftErrors): SummaryItem[] {
  const entries = Object.entries(errors).sort(byFieldPosition);
  return entries.map(([field, message]) => ({
    fieldId: fieldElementId(field),
    message,
  }));
}

/**
 * The id of the element to focus for a field's message: the input itself, an author row's family name input, or
 * the first radio of a radio group.
 *
 * @param field A field name as `validateDraft` keys it, e.g. "title" or "authors.2.family".
 */
export function fieldElementId(field: string): string {
  const authorRow = /^authors\.(\d+)\.family$/.exec(field);
  if (authorRow) return `author-${authorRow[1]}-family`;
  if (field === "design") return "study-design-meta-analysis";
  if (field === "subjects") return "study-subjects-humans";
  return `study-${field}`;
}

/** Sort order for [field, message] pairs: by the field's place on the page, then author rows top to bottom. */
function byFieldPosition(
  [first]: [string, string],
  [second]: [string, string],
): number {
  return fieldPosition(first) - fieldPosition(second);
}

/** A number that sorts fields into page order; author rows sort among themselves by row. */
function fieldPosition(field: string): number {
  const [baseField = field, row = "0"] = field.split(".");
  const ROWS_PER_FIELD = 1000;
  return FIELD_ORDER.indexOf(baseField) * ROWS_PER_FIELD + Number(row);
}
