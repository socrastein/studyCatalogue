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
import { formatAuthorList, hasEtAl, parseAuthorList } from "./authorList";
import type { StudyDetails } from "./study";

/** The year the first scientific journal (Philosophical Transactions) was published; no study can be older. */
export const EARLIEST_STUDY_YEAR = 1665;

/** How far past the current year a study's year may be: papers published online ahead of print carry next year. */
const YEARS_AHEAD_ALLOWED = 1;

export type StudyDraft = {
  title: string;
  /** The author list as typed or pasted; see authorList.ts for the forms it reads. */
  authors: string;
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
 * What is wrong with each field, by field name. A field with no
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
    authors: "",
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
 * Every field is named, never spread from `details`: the page passes a whole saved study (reactive, with its id,
 * timestamps and summary), and a draft must hold only plain form text and lists. A spread carried the summary object
 * (a reactive proxy) into the draft, and the form's `structuredClone` of the draft threw on it.
 *
 * @param details The saved study's details.
 */
export function draftFromDetails(details: StudyDetails): StudyDraft {
  return {
    title: details.title,
    authors: formatAuthorList(details.authors),
    year: String(details.year),
    journal: details.journal,
    volume: details.volume ?? "",
    issue: details.issue ?? "",
    pages: details.pages ?? "",
    doi: details.doi ?? "",
    url: details.url ?? "",
    abstract: details.abstract,
    tagIds: [...details.tagIds],
    design: details.design,
    subjects: details.subjects,
    ageGroups: [...details.ageGroups],
    trainingStatuses: [...details.trainingStatuses],
    sexes: [...details.sexes],
  };
}

/**
 * Checks a draft and, if everything is filled in correctly, turns it into study details: text trimmed, blank
 * optional fields as null, the DOI reduced to its bare form, and the author list read into names.
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

/** Messages for the required text fields left blank. */
function requiredTextErrors(draft: StudyDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (isBlank(draft.title)) errors.title = "Enter the study's title.";
  if (isBlank(draft.journal))
    errors.journal = "Enter the journal it was published in.";
  return errors;
}

/**
 * A message when the author list is empty, or cut short with "et al.": a reference needs every author (APA lists up
 * to 20), so the full list has to be entered.
 */
function authorErrors(authorList: string): DraftErrors {
  if (hasEtAl(authorList)) {
    return {
      authors:
        'Enter every author instead of "et al.": references list them all. Paste the list from the paper or PubMed.',
    };
  }
  if (parseAuthorList(authorList).length === 0) {
    return { authors: "Enter the authors." };
  }
  return {};
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
    authors: parseAuthorList(draft.authors),
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

/** Whether text is an absolute http or https address. */
function isWebAddress(text: string): boolean {
  if (!URL.canParse(text)) return false;
  const protocol = new URL(text).protocol;
  return protocol === "https:" || protocol === "http:";
}
