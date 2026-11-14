/**
 * The app's side of the home server's HTTP conversation (the other side is server/requestHandler.ts): read the
 * server's copy, and try to replace it. `fetch` is passed in, so tests need no network. Nothing here throws: every
 * failure is a value the caller handles.
 */
import {
  CATALOGUE_API_PATH,
  readNumberedCatalogue,
  saveRequestText,
  type NumberedCatalogue,
} from "../catalogue/homeServerProtocol";
import type { Catalogue } from "../catalogue/catalogue";

/** The part of `fetch` used here, so a test can pass a fake. */
export type FetchFunction = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

/** What the server said to a save. */
export type SaveOutcome =
  | { kind: "saved"; revision: number }
  | { kind: "conflict"; current: NumberedCatalogue }
  | { kind: "failed"; reason: string };

/** How long a read may take before it counts as no answer, so a hung server cannot keep the app from opening. */
const READ_TIMEOUT_MILLISECONDS = 5000;

/** HTTP status codes from 500 up mean the server itself failed (RFC 9110, 15.6): a proxy in front of a dead home server answers 502. */
const FIRST_SERVER_ERROR_STATUS = 500;

/** What the app's own address answered when asked for the catalogue. */
export type ServerAnswer =
  | { kind: "copy"; copy: NumberedCatalogue }
  /** An answer, but not a home server's: a 404 or the app's own page, as a static host or dev server gives. */
  | { kind: "notAHomeServer" }
  /** No usable answer: no connection, a timeout, a server error (5xx) or a body cut off half way. */
  | { kind: "noAnswer" };

/**
 * Asks the app's own address for the catalogue, and tells apart an address that is not a home server (it answered
 * something else) from one that did not answer at all: the first is normal on a dev server, the second means a home
 * server that is down.
 */
export async function askForServerCopy(
  fetchFunction: FetchFunction,
): Promise<ServerAnswer> {
  try {
    const response = await fetchFunction(CATALOGUE_API_PATH, {
      cache: "no-store",
      signal: AbortSignal.timeout(READ_TIMEOUT_MILLISECONDS),
    });
    const isServerError = response.status >= FIRST_SERVER_ERROR_STATUS;
    if (isServerError) return { kind: "noAnswer" };
    if (!response.ok) return { kind: "notAHomeServer" };
    // Read as text before parsing: a connection that drops here is no answer, but text that is not JSON is another site
    return answerFromText(await response.text());
  } catch {
    return { kind: "noAnswer" };
  }
}

/** The answer a successful response's body stands for. */
function answerFromText(text: string): ServerAnswer {
  try {
    const copy = numberedCatalogueFrom(JSON.parse(text));
    return copy === null ? { kind: "notAHomeServer" } : { kind: "copy", copy };
  } catch {
    return { kind: "notAHomeServer" };
  }
}

/**
 * The server's copy of the catalogue.
 *
 * @returns null for anything but a well-formed answer: a static host or dev server (whose answer is a 404 or the
 *   app's own page), no connection, a timeout, or an unreadable body.
 */
export async function readServerCopy(
  fetchFunction: FetchFunction,
): Promise<NumberedCatalogue | null> {
  const answer = await askForServerCopy(fetchFunction);
  return answer.kind === "copy" ? answer.copy : null;
}

/**
 * Asks the server to replace its copy.
 *
 * @param baseRevision The revision of the server copy the catalogue was made from.
 * @param catalogue The catalogue to store.
 */
export async function putServerCopy(
  fetchFunction: FetchFunction,
  baseRevision: number,
  catalogue: Catalogue,
): Promise<SaveOutcome> {
  try {
    const response = await fetchFunction(CATALOGUE_API_PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: saveRequestText({ baseRevision, catalogue }),
    });
    return await describeSaveAnswer(response);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { kind: "failed", reason: `no answer from the server: ${reason}` };
  }
}

/** The outcome a server's answer to a save stands for. */
async function describeSaveAnswer(response: Response): Promise<SaveOutcome> {
  if (response.status === 409) {
    const current = numberedCatalogueFrom(await response.json());
    if (current === null)
      return { kind: "failed", reason: "the server's answer was unreadable" };
    return { kind: "conflict", current };
  }
  if (!response.ok)
    return {
      kind: "failed",
      reason: `the server answered ${response.status}`,
    };
  const revision = revisionIn(await response.json());
  if (revision === undefined)
    return { kind: "failed", reason: "the server's answer was unreadable" };
  return { kind: "saved", revision };
}

/** The revision in a server's answer to a save, `{ "revision": 5 }`; undefined when it does not say one. */
function revisionIn(answer: unknown): number | undefined {
  const isRecord = typeof answer === "object" && answer !== null;
  if (!isRecord || !("revision" in answer)) return undefined;
  return typeof answer.revision === "number" ? answer.revision : undefined;
}

/** The numbered catalogue in parsed JSON, or null when it is not one. */
function numberedCatalogueFrom(value: unknown): NumberedCatalogue | null {
  const result = readNumberedCatalogue(value);
  return result.kind === "valid" ? result.message : null;
}
