/**
 * Text comparison for search and lookups, forgiving the differences a person does not mean: case, surrounding
 * spaces, and accents ("Müller" matches "muller").
 */

/**
 * Text in the form used to compare it: trimmed, lowercased, with accents removed.
 *
 * @param text Any text, e.g. a tag name or a search query.
 * @returns e.g. "  Müller " gives "muller".
 */
export function foldForMatching(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Whether the text contains the query, ignoring case, accents and the query's surrounding spaces.
 *
 * @param text The text to look in.
 * @param query What to look for; an empty query is contained in everything.
 */
export function containsFolded(text: string, query: string): boolean {
  return foldForMatching(text).includes(foldForMatching(query));
}
