/**
 * Where each validation message belongs in the study form: which element a message's error summary link points to,
 * and the order messages are listed in (the order of the fields on the page).
 */
import type { DraftErrors } from "../catalogue/studyDraft";

/** One line of the error summary: the message, and the id of the field it links to. */
export type SummaryItem = { fieldId: string; message: string };

/** The fields that can have a message, top to bottom as the form shows them. */
const FIELD_ORDER = [
  "doi",
  "title",
  "authors",
  "year",
  "journal",
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
 * The id of the element to focus for a field's message: the input itself, or the first radio of a radio group.
 *
 * @param field A field name as `validateDraft` keys it, e.g. "title".
 */
export function fieldElementId(field: string): string {
  if (field === "design") return "study-design-meta-analysis";
  if (field === "subjects") return "study-subjects-humans";
  return `study-${field}`;
}

/** Sort order for [field, message] pairs: by the field's place on the page. */
function byFieldPosition(
  [first]: [string, string],
  [second]: [string, string],
): number {
  return fieldPosition(first) - fieldPosition(second);
}

/** The field's place on the page, counting from the top. */
function fieldPosition(field: string): number {
  return FIELD_ORDER.indexOf(field);
}
