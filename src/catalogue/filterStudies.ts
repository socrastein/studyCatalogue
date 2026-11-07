/**
 * Finding studies: a search query, topic tags and facet values combined into one filter. Within one facet any
 * chosen value matches (OR); across the query, the tags and the facets every part must match (AND). So "Hypertrophy"
 * + trained + meta-analysis finds meta-analyses on hypertrophy (or anything tagged beneath it) in trained people.
 *
 * Population facets (age group, training status, sex) can be unreported. A study that does not report a facet never
 * matches a filter on it, and the result counts how many such studies were left out, so they are not silently lost.
 */
import { fullName } from "./citations/authorNames";
import type {
  AgeGroupId,
  SexId,
  StudyDesignId,
  SubjectsId,
  TrainingStatusId,
} from "./facets";
import type { Study } from "./study";
import { descendantIds, type Tag } from "./tags";
import { foldForMatching } from "./textMatching";

export type StudyFilters = {
  /** Words to search for; every word must appear somewhere in the study. Empty searches nothing. */
  query: string;
  /** Each chosen tag must be on the study, or a tag beneath it. */
  tagIds: readonly string[];
  designs: readonly StudyDesignId[];
  subjects: readonly SubjectsId[];
  ageGroups: readonly AgeGroupId[];
  trainingStatuses: readonly TrainingStatusId[];
  sexes: readonly SexId[];
};

/** The population facets: the ones a study may leave unreported. */
export const POPULATION_FACETS = [
  "ageGroups",
  "trainingStatuses",
  "sexes",
] as const;

export type PopulationFacet = (typeof POPULATION_FACETS)[number];

export type FilterResult = {
  /** The studies that match every filter, in the order given. */
  matches: Study[];
  /**
   * For each population facet being filtered on, how many studies matched everything else but were left out because
   * they do not report that facet.
   */
  unreportedCounts: Partial<Record<PopulationFacet, number>>;
};

/** Filters that match every study. */
export function emptyFilters(): StudyFilters {
  return {
    query: "",
    tagIds: [],
    designs: [],
    subjects: [],
    ageGroups: [],
    trainingStatuses: [],
    sexes: [],
  };
}

/**
 * Whether any filter is set: a non-blank query or any chosen tag or facet value.
 *
 * @param filters The filters to check.
 */
export function hasActiveFilters(filters: StudyFilters): boolean {
  const { query, ...choices } = filters;
  const hasChoices = Object.values(choices).some((chosen) => chosen.length > 0);
  return query.trim() !== "" || hasChoices;
}

/**
 * The studies that match the filters, and how many were left out for not reporting a filtered population facet.
 *
 * @param studies The studies to filter, in the order the result should keep.
 * @param tags Every tag in the catalogue, for searching tag names and following the tag hierarchy.
 * @param filters What to match.
 */
export function filterStudies(
  studies: readonly Study[],
  tags: readonly Tag[],
  filters: StudyFilters,
): FilterResult {
  const matchesOtherFilters = studyMatcher(tags, filters);
  const candidates = studies.filter(matchesOtherFilters);
  const matches = candidates.filter((study) =>
    matchesPopulation(study, filters),
  );
  return { matches, unreportedCounts: unreportedCounts(candidates, filters) };
}

/**
 * A test for everything except the population facets: the query, the tags, design and subjects. Built once per
 * filtering, so each chosen tag's descendants are worked out once rather than once per study.
 */
function studyMatcher(
  tags: readonly Tag[],
  filters: StudyFilters,
): (study: Study) => boolean {
  const queryWords = searchWords(filters.query);
  const acceptedTagSets = filters.tagIds.map((tagId) =>
    descendantIds(tagId, tags),
  );
  return (study) => {
    const hasEveryTag = acceptedTagSets.every((accepted) =>
      hasTagIn(study, accepted),
    );
    return (
      matchesDesignAndSubjects(study, filters) &&
      hasEveryTag &&
      containsEveryWord(study, tags, queryWords)
    );
  };
}

/** The separate words of a search, folded for matching; none for a blank search. */
function searchWords(query: string): string[] {
  return foldForMatching(query)
    .split(/\s+/)
    .filter((word) => word !== "");
}

/** Whether the study's design and subjects are among those chosen (or nothing is chosen). */
function matchesDesignAndSubjects(
  study: Study,
  filters: StudyFilters,
): boolean {
  const hasChosenDesign = isChosenOrUnfiltered(filters.designs, study.design);
  const hasChosenSubjects = isChosenOrUnfiltered(
    filters.subjects,
    study.subjects,
  );
  return hasChosenDesign && hasChosenSubjects;
}

/** Whether every search word appears somewhere in the study; true when there are no words. */
function containsEveryWord(
  study: Study,
  tags: readonly Tag[],
  words: readonly string[],
): boolean {
  if (words.length === 0) return true;
  const text = searchableText(study, tags);
  return words.every((word) => text.includes(word));
}

/** Whether the study passes every population facet filter: each filtered facet shares a value with the study. */
function matchesPopulation(study: Study, filters: StudyFilters): boolean {
  return POPULATION_FACETS.every((facet) => {
    const chosen: readonly string[] = filters[facet];
    if (chosen.length === 0) return true;
    return study[facet].some((value) => chosen.includes(value));
  });
}

/** For each filtered population facet, how many of the candidates do not report it. */
function unreportedCounts(
  candidates: readonly Study[],
  filters: StudyFilters,
): Partial<Record<PopulationFacet, number>> {
  const counts: Partial<Record<PopulationFacet, number>> = {};
  for (const facet of POPULATION_FACETS) {
    if (filters[facet].length === 0) continue;
    counts[facet] = candidates.filter(
      (study) => study[facet].length === 0,
    ).length;
  }
  return counts;
}

/** Whether a single-value facet passes: nothing chosen, or the study's value is one of those chosen. */
function isChosenOrUnfiltered<Id extends string>(
  chosen: readonly Id[],
  value: Id,
): boolean {
  return chosen.length === 0 || chosen.includes(value);
}

/** Whether the study has at least one of the accepted tags. */
function hasTagIn(study: Study, accepted: Set<string>): boolean {
  return study.tagIds.some((tagId) => accepted.has(tagId));
}

/**
 * Everything a search looks in, folded for matching: title, authors, year, journal, abstract, and the names and
 * aliases of the study's tags. The year is searched as text, so "howe 2021" finds Howe's 2021 paper.
 */
function searchableText(study: Study, tags: readonly Tag[]): string {
  const studyTags = tags.filter((tag) => study.tagIds.includes(tag.id));
  const parts = [
    study.title,
    ...study.authors.map(fullName),
    String(study.year),
    study.journal,
    study.abstract,
    ...studyTags.flatMap((tag) => [tag.name, ...tag.aliases]),
  ];
  return foldForMatching(parts.join(" "));
}
