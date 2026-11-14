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

/**
 * The server's copy of the catalogue.
 *
 * @returns null for anything but a well-formed answer: a static host or dev server (whose answer is a 404 or the
 *   app's own page), no connection, a timeout, or an unreadable body.
 */
export async function readServerCopy(
  fetchFunction: FetchFunction,
): Promise<NumberedCatalogue | null> {
  try {
    const response = await fetchFunction(CATALOGUE_API_PATH, {
      cache: "no-store",
      signal: AbortSignal.timeout(READ_TIMEOUT_MILLISECONDS),
    });
    if (!response.ok) return null;
    return numberedCatalogueFrom(await response.json());
  } catch {
    return null;
  }
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
