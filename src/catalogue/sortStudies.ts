/**
 * The orders the study list can be sorted in, chosen on the browse page and kept in its URL (views/filtersInUrl.ts).
 * Each is a vocabulary entry like a facet value: a stable id for the URL and a label for the drop-down.
 */
import type { Study } from "./study";

export const SORT_ORDERS = [
  { id: "newest", label: "Newest published" },
  { id: "oldest", label: "Oldest published" },
  { id: "added", label: "Recently added" },
  { id: "author", label: "First author, A to Z" },
] as const;

export type SortOrder = (typeof SORT_ORDERS)[number]["id"];

/** The order the list starts in: the latest research first. */
export const DEFAULT_SORT_ORDER: SortOrder = "newest";

type StudyComparison = (first: Study, second: Study) => number;

const COMPARISONS: Record<SortOrder, StudyComparison> = {
  newest: (first, second) => second.year - first.year || byTitle(first, second),
  oldest: (first, second) => first.year - second.year || byTitle(first, second),
  added: byMostRecentlyAdded,
  author: byFirstAuthor,
};

/**
 * The studies in the given order; ties are broken by title, so the order never depends on how they were stored.
 *
 * @param studies The studies to sort; not changed.
 * @param order One of `SORT_ORDERS`.
 * @returns A new, sorted list.
 */
export function sortStudies(
  studies: readonly Study[],
  order: SortOrder,
): Study[] {
  return [...studies].sort(COMPARISONS[order]);
}

/**
 * Whether a string is one of the sort orders, e.g. a `sort` value read from the URL.
 *
 * @param candidate The string to check.
 */
export function isSortOrder(candidate: string): candidate is SortOrder {
  return SORT_ORDERS.some((order) => order.id === candidate);
}

/** Alphabetical by title, ignoring case and accents. */
function byTitle(first: Study, second: Study): number {
  return compareText(first.title, second.title);
}

/** Entered most recently first. ISO 8601 timestamps in UTC sort correctly as text. */
function byMostRecentlyAdded(first: Study, second: Study): number {
  const newerFirst = second.createdAt.localeCompare(first.createdAt);
  return newerFirst || byTitle(first, second);
}

/**
 * By the first author's family name, then given names; one author's studies oldest first, as an APA reference list
 * orders them. A study without authors (never saved by the form, but possible in old data) comes last.
 */
function byFirstAuthor(first: Study, second: Study): number {
  const firstAuthor = first.authors[0];
  const secondAuthor = second.authors[0];
  if (firstAuthor === undefined && secondAuthor === undefined)
    return byTitle(first, second);
  if (firstAuthor === undefined) return 1;
  if (secondAuthor === undefined) return -1;
  const byName =
    compareText(firstAuthor.family, secondAuthor.family) ||
    compareText(firstAuthor.given, secondAuthor.given);
  return byName || first.year - second.year || byTitle(first, second);
}

/** Text order for people: "de Vries" beside "De Souza", "Ödegaard" beside "Odegaard". */
function compareText(first: string, second: string): number {
  return first.localeCompare(second, undefined, { sensitivity: "base" });
}
