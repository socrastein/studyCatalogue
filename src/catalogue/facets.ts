/**
 * The facets: fixed vocabularies every study is described by, alongside its free-form topic tags. Study design and
 * subjects take one value per study; age group, training status and sex take several, because many studies compare
 * groups, and an empty list means the study does not report it.
 *
 * Each value has a stable `id`, which is what a saved study stores, and a `label` for display, which can be reworded
 * without touching saved data.
 */

/** How the study was done, roughly from strongest to weakest evidence. */
export const STUDY_DESIGNS = [
  { id: "meta-analysis", label: "Meta-analysis" },
  { id: "systematic-review", label: "Systematic review" },
  { id: "randomized-controlled-trial", label: "Randomized controlled trial" },
  { id: "non-randomized-trial", label: "Non-randomized trial" },
  { id: "cohort", label: "Cohort study" },
  { id: "case-control", label: "Case-control study" },
  { id: "cross-sectional", label: "Cross-sectional study" },
  { id: "case-report", label: "Case report" },
  { id: "narrative-review", label: "Narrative review" },
  { id: "other", label: "Other" },
] as const;

/** Who or what was studied. A separate facet from design, so an animal RCT is still an RCT. */
export const SUBJECTS = [
  { id: "humans", label: "Humans" },
  { id: "animals", label: "Animals" },
  { id: "cells-or-tissue", label: "Cells or tissue" },
] as const;

/** Age bands as commonly reported in research; 65 is the usual "older adult" line. */
export const AGE_GROUPS = [
  { id: "children", label: "Children (under 13)" },
  { id: "adolescents", label: "Adolescents (13-17)" },
  { id: "young-adults", label: "Young adults (18-39)" },
  { id: "middle-aged", label: "Middle-aged (40-64)" },
  { id: "older-adults", label: "Older adults (65+)" },
] as const;

/** Training experience of the participants. */
export const TRAINING_STATUSES = [
  { id: "untrained", label: "Untrained" },
  { id: "recreationally-active", label: "Recreationally active" },
  { id: "trained", label: "Trained" },
  { id: "elite", label: "Elite or competitive" },
] as const;

/** Participants' sex. A mixed sample has both. */
export const SEXES = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
] as const;

export type StudyDesignId = (typeof STUDY_DESIGNS)[number]["id"];
export type SubjectsId = (typeof SUBJECTS)[number]["id"];
export type AgeGroupId = (typeof AGE_GROUPS)[number]["id"];
export type TrainingStatusId = (typeof TRAINING_STATUSES)[number]["id"];
export type SexId = (typeof SEXES)[number]["id"];

/** One value of any facet. */
export type FacetValue = { readonly id: string; readonly label: string };

/**
 * Whether a string is the id of one of the given facet values, e.g. whether "cohort" is a study design.
 *
 * @param values One facet's vocabulary, such as `STUDY_DESIGNS`.
 * @param candidate The string to check, typically read from saved or imported data.
 * @returns true when `candidate` is one of the ids, narrowing it to that facet's id type.
 */
export function isFacetId<Values extends readonly FacetValue[]>(
  values: Values,
  candidate: string,
): candidate is Values[number]["id"] {
  return values.some((value) => value.id === candidate);
}

/**
 * The display label of a facet value.
 *
 * @param values One facet's vocabulary.
 * @param id An id from that vocabulary.
 * @returns The label, e.g. "Older adults (65+)"; the id itself if it is not in the vocabulary, which validated data
 *   never has.
 */
export function facetLabel(values: readonly FacetValue[], id: string): string {
  const match = values.find((value) => value.id === id);
  return match === undefined ? id : match.label;
}
