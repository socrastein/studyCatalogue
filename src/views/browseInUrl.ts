/**
 * The browse page's state as URL query parameters and back: its filters and its sort order, so a search can be
 * bookmarked or shared, and returning from a study's edit page restores it. Example:
 * "/?q=volume&tag=exercise-science%2Fhypertrophy&training=trained&sort=author".
 *
 * Reading never trusts the URL: facet values not in their vocabulary, and unknown sort orders, are dropped rather
 * than passed on.
 */
import type { LocationQuery, LocationQueryRaw } from "vue-router";
import {
  AGE_GROUPS,
  isFacetId,
  SEXES,
  STUDY_DESIGNS,
  SUBJECTS,
  TRAINING_STATUSES,
  type FacetValue,
} from "../catalogue/facets";
import type { StudyFilters } from "../catalogue/filterStudies";
import {
  DEFAULT_SORT_ORDER,
  isSortOrder,
  type SortOrder,
} from "../catalogue/sortStudies";

/** The query parameter for the sort order. */
const SORT_PARAMETER = "sort";

/** The query parameter for each filter: short, readable names, as they appear in the address bar. */
const PARAMETERS = {
  query: "q",
  tagIds: "tag",
  designs: "design",
  subjects: "subjects",
  ageGroups: "age",
  trainingStatuses: "training",
  sexes: "sex",
} as const satisfies Record<keyof StudyFilters, string>;

/** Every filter that is a list of values, i.e. all but the search query. */
const LIST_FILTERS = [
  "tagIds",
  "designs",
  "subjects",
  "ageGroups",
  "trainingStatuses",
  "sexes",
] as const satisfies readonly (keyof StudyFilters)[];

/**
 * The filters a URL's query describes; anything missing or unrecognized is left unfiltered.
 *
 * @param query The route's query, as vue-router parses it.
 */
export function filtersFromQuery(query: LocationQuery): StudyFilters {
  return {
    query: parameterValues(query, PARAMETERS.query)[0] ?? "",
    tagIds: parameterValues(query, PARAMETERS.tagIds),
    designs: facetValues(query, PARAMETERS.designs, STUDY_DESIGNS),
    subjects: facetValues(query, PARAMETERS.subjects, SUBJECTS),
    ageGroups: facetValues(query, PARAMETERS.ageGroups, AGE_GROUPS),
    trainingStatuses: facetValues(
      query,
      PARAMETERS.trainingStatuses,
      TRAINING_STATUSES,
    ),
    sexes: facetValues(query, PARAMETERS.sexes, SEXES),
  };
}

/**
 * The query parameters for a set of filters, leaving out unset ones so an unfiltered list has a clean "/".
 *
 * @param filters The filters to put in the URL.
 */
export function queryFromFilters(filters: StudyFilters): LocationQueryRaw {
  const query: LocationQueryRaw = {};
  const trimmedQuery = filters.query.trim();
  if (trimmedQuery !== "") query[PARAMETERS.query] = trimmedQuery;
  for (const key of LIST_FILTERS) {
    if (filters[key].length > 0) query[PARAMETERS[key]] = [...filters[key]];
  }
  return query;
}

/**
 * The sort order a URL's query asks for; the default when it names none, or one that does not exist.
 *
 * @param query The route's query, as vue-router parses it.
 */
export function sortOrderFromQuery(query: LocationQuery): SortOrder {
  const named = parameterValues(query, SORT_PARAMETER)[0] ?? "";
  return isSortOrder(named) ? named : DEFAULT_SORT_ORDER;
}

/**
 * The browse page's whole query: its filters and its sort order. The default order is left out, so an unsorted,
 * unfiltered list is a clean "/".
 *
 * @param filters The filters to put in the URL.
 * @param sortOrder The chosen sort order.
 */
export function browseQuery(
  filters: StudyFilters,
  sortOrder: SortOrder,
): LocationQueryRaw {
  const query = queryFromFilters(filters);
  if (sortOrder !== DEFAULT_SORT_ORDER) query[SORT_PARAMETER] = sortOrder;
  return query;
}

/** Every non-empty value of one query parameter, whether it appears once or repeated. */
function parameterValues(query: LocationQuery, parameter: string): string[] {
  const raw = query[parameter];
  const values = Array.isArray(raw) ? raw : [raw];
  return values.filter(
    (value) => typeof value === "string" && value !== "",
  ) as string[];
}

/** The values of a facet's parameter that are in its vocabulary. */
function facetValues<Values extends readonly FacetValue[]>(
  query: LocationQuery,
  parameter: string,
  vocabulary: Values,
): Values[number]["id"][] {
  return parameterValues(query, parameter).filter((value) =>
    isFacetId(vocabulary, value),
  );
}
