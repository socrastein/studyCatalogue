/**
 * DOIs (Digital Object Identifiers): the permanent id of a published paper, e.g. "10.1519/JSC.0000000000002345".
 * A study stores the bare DOI; links are built from it.
 */

/** The prefixes people paste DOIs with, removed to leave the bare DOI. Case-insensitive. */
const DOI_PREFIXES = [/^https?:\/\/(dx\.)?doi\.org\//i, /^doi:\s*/i];

/**
 * The bare DOI from whatever form it was pasted in: "https://doi.org/10.1/abc", "doi: 10.1/abc" and "10.1/abc" all
 * give "10.1/abc".
 *
 * @param input The DOI as typed or pasted.
 * @returns The bare DOI; null when the input is blank.
 */
export function normalizeDoi(input: string): string | null {
  let doi = input.trim();
  for (const prefix of DOI_PREFIXES) doi = doi.replace(prefix, "");
  return doi === "" ? null : doi;
}

/**
 * Whether a bare DOI has the shape every DOI has: "10.", a registrant number of at least four digits, a slash, then
 * the item's own suffix.
 *
 * @param doi A bare DOI, as `normalizeDoi` returns it.
 */
export function isValidDoi(doi: string): boolean {
  return /^10\.\d{4,}(\.\d+)*\/\S+$/.test(doi);
}

/**
 * The link that resolves a DOI to its paper, e.g. "https://doi.org/10.1/abc".
 *
 * @param doi A bare DOI.
 */
export function doiUrl(doi: string): string {
  return `https://doi.org/${doi}`;
}
