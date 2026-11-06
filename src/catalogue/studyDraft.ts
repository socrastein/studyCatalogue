/**
 * A study as it is being typed into the form: every field as the text in its input, possibly incomplete or wrong.
 * `validateDraft` checks a draft and either turns it into the study details the catalogue saves, or says what is
 * wrong with each field, in words meant for the person filling in the form.
 */
import { isValidDoi, normalizeDoi } from "./doi";
import type {
  AgeGroupId,
  SexId,
  StudyDesignId,
  SubjectsId,
  TrainingStatusId,
} from "./facets";
import type { Author, StudyDetails } from "./study";

/** The year the first scientific journal (Philosophical Transactions) was published; no study can be older. */
export const EARLIEST_STUDY_YEAR = 1665;

/** How far past the current year a study's year may be: papers published online ahead of print carry next year. */
const YEARS_AHEAD_ALLOWED = 1;

export type StudyDraft = {
  title: string;
  authors: Author[];
  year: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  url: string;
  abstract: string;
  tagIds: string[];
  /** Empty until one is chosen. */
  design: StudyDesignId | "";
  subjects: SubjectsId | "";
  ageGroups: AgeGroupId[];
  trainingStatuses: TrainingStatusId[];
  sexes: SexId[];
};

/**
 * What is wrong with each field, by field name; author rows use "authors.0.family" and the like. A field with no
 * entry is fine.
 */
export type DraftErrors = Record<string, string>;

export type DraftResult =
  | { kind: "valid"; details: StudyDetails }
  | { kind: "invalid"; errors: DraftErrors };

/**
 * The draft for a new study: everything blank, one empty author row to type into, and subjects preset to humans,
 * which almost every study in this catalogue will be.
 */
export function emptyDraft(): StudyDraft {
  return {
    title: "",
    authors: [{ family: "", given: "" }],
    year: "",
    journal: "",
    volume: "",
    issue: "",
    pages: "",
    doi: "",
    url: "",
    abstract: "",
    tagIds: [],
    design: "",
    subjects: "humans",
    ageGroups: [],
    trainingStatuses: [],
    sexes: [],
  };
}

/**
 * The draft for editing a saved study: its details as form text, with missing optional fields as empty text.
 *
 * @param details The saved study's details.
 */
export function draftFromDetails(details: StudyDetails): StudyDraft {
  return {
    ...details,
    authors: details.authors.map((author) => ({ ...author })),
    year: String(details.year),
    volume: details.volume ?? "",
    issue: details.issue ?? "",
    pages: details.pages ?? "",
    doi: details.doi ?? "",
    url: details.url ?? "",
    tagIds: [...details.tagIds],
    ageGroups: [...details.ageGroups],
    trainingStatuses: [...details.trainingStatuses],
    sexes: [...details.sexes],
  };
}

/**
 * Checks a draft and, if everything is filled in correctly, turns it into study details: text trimmed, blank
 * optional fields as null, the DOI reduced to its bare form, and blank author rows dropped.
 *
 * @param draft The form's current contents.
 * @param currentYear The year to check the study's year against; this year unless a test fixes it.
 * @returns "valid" with the details to save, or "invalid" with a message for each field that is wrong.
 */
export function validateDraft(
  draft: StudyDraft,
  currentYear = new Date().getFullYear(),
): DraftResult {
  const errors: DraftErrors = {
    ...requiredTextErrors(draft),
    ...authorErrors(draft.authors),
    ...yearErrors(draft.year, currentYear),
    ...linkErrors(draft),
    ...facetErrors(draft),
  };
  if (Object.keys(errors).length > 0) return { kind: "invalid", errors };
  return { kind: "valid", details: detailsFromValidDraft(draft) };
}

/** The author rows that have anything typed in them; rows left completely blank are ignored. */
function filledAuthorRows(authors: readonly Author[]): Author[] {
  return authors.filter(
    (author) => !isBlank(author.family) || !isBlank(author.given),
  );
}

/** Messages for the required text fields left blank. */
function requiredTextErrors(draft: StudyDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (isBlank(draft.title)) errors.title = "Enter the study's title.";
  if (isBlank(draft.journal))
    errors.journal = "Enter the journal it was published in.";
  return errors;
}

/**
 * Messages for the authors: at least one is needed, and each row with anything typed in it needs a family name.
 * Messages are keyed by row ("authors.2.family") so each appears beside its own row.
 */
function authorErrors(authors: readonly Author[]): DraftErrors {
  if (filledAuthorRows(authors).length === 0) {
    return { "authors.0.family": "Enter at least one author's family name." };
  }
  const errors: DraftErrors = {};
  for (const [index, author] of authors.entries()) {
    const isFilledWithoutFamily =
      !isBlank(author.given) && isBlank(author.family);
    if (isFilledWithoutFamily) {
      errors[`authors.${index}.family`] = "Enter this author's family name.";
    }
  }
  return errors;
}

/** A message when the year is missing, not a whole number, or outside the years a study can have. */
function yearErrors(year: string, currentYear: number): DraftErrors {
  const latestYear = currentYear + YEARS_AHEAD_ALLOWED;
  const range = `between ${EARLIEST_STUDY_YEAR} and ${latestYear}`;
  if (isBlank(year)) return { year: "Enter the year it was published." };
  if (!/^\d+$/.test(year.trim()))
    return { year: `Enter the year as a number, ${range}.` };
  const yearNumber = Number(year);
  const isInRange =
    yearNumber >= EARLIEST_STUDY_YEAR && yearNumber <= latestYear;
  return isInRange ? {} : { year: `Enter a year ${range}.` };
}

/** Messages for a DOI or URL that is filled in but not in a usable form. */
function linkErrors(draft: StudyDraft): DraftErrors {
  const errors: DraftErrors = {};
  const doi = normalizeDoi(draft.doi);
  if (doi !== null && !isValidDoi(doi)) {
    errors.doi =
      "Enter a DOI starting with 10., such as 10.1080/02640414.2016.1210197, or a doi.org link.";
  }
  if (!isBlank(draft.url) && !isWebAddress(draft.url.trim())) {
    errors.url = "Enter a full web address starting with https:// or http://.";
  }
  return errors;
}

/** Messages for the facets that must be chosen. */
function facetErrors(draft: StudyDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (draft.design === "") errors.design = "Choose the study design.";
  if (draft.subjects === "") errors.subjects = "Choose what was studied.";
  return errors;
}

/** The details from a draft that `validateDraft` found valid. */
function detailsFromValidDraft(draft: StudyDraft): StudyDetails {
  return {
    ...draft,
    title: draft.title.trim(),
    authors: filledAuthorRows(draft.authors).map(trimmedAuthor),
    year: Number(draft.year),
    journal: draft.journal.trim(),
    volume: textOrNull(draft.volume),
    issue: textOrNull(draft.issue),
    pages: textOrNull(draft.pages),
    doi: normalizeDoi(draft.doi),
    url: textOrNull(draft.url),
    abstract: draft.abstract.trim(),
    // Validation has already rejected an empty design or subjects
    design: draft.design as StudyDesignId,
    subjects: draft.subjects as SubjectsId,
  };
}

/** Whether text is empty or only spaces. */
function isBlank(text: string): boolean {
  return text.trim() === "";
}

/** The text trimmed; null when nothing is left. */
function textOrNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

/** An author with both names trimmed. */
function trimmedAuthor(author: Author): Author {
  return { family: author.family.trim(), given: author.given.trim() };
}

/** Whether text is an absolute http or https address. */
function isWebAddress(text: string): boolean {
  if (!URL.canParse(text)) return false;
  const protocol = new URL(text).protocol;
  return protocol === "https:" || protocol === "http:";
}
