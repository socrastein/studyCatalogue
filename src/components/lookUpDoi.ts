/**
 * Looking a DOI up on Crossref's public API from the browser (Crossref allows requests from any site). Only the DOI
 * is sent. No email address is sent, so requests go to Crossref's ordinary shared pool rather than its "polite" one;
 * that is plenty for a study added now and then.
 */
import { crossrefFields, type CrossrefFields } from "../catalogue/crossref";

/** Crossref's endpoint for one work; the DOI is appended, URL-encoded. */
const CROSSREF_WORKS_URL = "https://api.crossref.org/works/";

export type LookupResult =
  | { kind: "found"; fields: CrossrefFields }
  | { kind: "notFound" }
  | { kind: "failed" };

/**
 * The publication details Crossref has for a DOI.
 *
 * @param doi A bare DOI, e.g. "10.1080/02640414.2016.1210197".
 * @param fetchFunction The fetch to use; the browser's unless a test supplies one.
 * @returns "found" with whatever fields the record has; "notFound" when Crossref has no such DOI (some DOIs are
 *   registered elsewhere, e.g. DataCite); "failed" when Crossref could not be reached or answered with an error.
 */
export async function lookUpDoi(
  doi: string,
  fetchFunction: typeof fetch = fetch,
): Promise<LookupResult> {
  try {
    const response = await fetchFunction(
      CROSSREF_WORKS_URL + encodeURIComponent(doi),
    );
    if (response.status === 404) return { kind: "notFound" };
    if (!response.ok) return { kind: "failed" };
    const body: unknown = await response.json();
    return { kind: "found", fields: crossrefFields(messageOf(body)) };
  } catch {
    return { kind: "failed" };
  }
}

/** The "message" object Crossref wraps a record in. */
function messageOf(body: unknown): unknown {
  if (typeof body !== "object" || body === null) return undefined;
  return (body as Record<string, unknown>).message;
}
