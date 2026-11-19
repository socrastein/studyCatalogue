/**
 * The app's side of the papers list: asks the home server (server/papers.ts) for the PDF names in Matt's papers folder,
 * and says plainly when it cannot. `fetch` is passed in, so tests need no network. Nothing here throws: every failure is
 * a value the page shows.
 */
import { PAPERS_API_PATH } from "../catalogue/homeServerProtocol";
import type { FetchFunction } from "./homeServerClient";

/** How long the list may take before it counts as no answer; the scan of the drive is the slow part. */
const LIST_TIMEOUT_MILLISECONDS = 15000;

/** What the papers list answered: the names, or the reason the page cannot say which papers are on file. */
export type PaperFilesAnswer =
  | { kind: "listed"; fileNames: string[] }
  | { kind: "unavailable"; reason: string };

/** The reason when the app is not served by the home server (a dev server, a static host), so nothing answers at all. */
const NO_HOME_SERVER_REASON =
  "The home server did not answer, so the papers folder cannot be checked. The Fetch list needs the home server, which is not running here.";

/**
 * Asks the home server for the PDF names in the papers folder.
 *
 * @param fetchFunction The browser's `fetch`, or a fake in tests.
 * @returns The names, or `unavailable` with the server's own message when it refused (503 names the folder), or with a
 * reason when it did not answer or answered something that is not the list.
 */
export async function askForPaperFiles(
  fetchFunction: FetchFunction,
): Promise<PaperFilesAnswer> {
  let response: Response;
  try {
    response = await fetchFunction(PAPERS_API_PATH, {
      cache: "no-store",
      signal: AbortSignal.timeout(LIST_TIMEOUT_MILLISECONDS),
    });
  } catch {
    // The error's text is not kept: the reason says what is known for the person
    return { kind: "unavailable", reason: NO_HOME_SERVER_REASON };
  }
  return answerFrom(response);
}

/**
 * The answer a response stands for: the names, or the reason the response is not the list.
 *
 * @param response The home server's response to the list request.
 */
async function answerFrom(response: Response): Promise<PaperFilesAnswer> {
  const body = await readJsonBody(response);
  if (body === undefined)
    return { kind: "unavailable", reason: NO_HOME_SERVER_REASON };
  if (!response.ok)
    return {
      kind: "unavailable",
      reason: refusalReason(body, response.status),
    };
  return listAnswer(body);
}

/**
 * The response's body as JSON. Undefined when it cannot be read or is not JSON, which is what a dev server's page or
 * another site looks like at this address.
 *
 * @param response The response whose body to read.
 */
async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return JSON.parse(await response.text());
  } catch {
    return undefined;
  }
}

/**
 * The list answer as the page's answer: the names, or the reason it is not the list.
 *
 * @param body The parsed answer to a successful request.
 */
function listAnswer(body: unknown): PaperFilesAnswer {
  const fileNames = fileNamesFrom(body);
  // Not the list: refused as a whole, so the page never lists nothing for an answer it could not read
  if (fileNames === null) {
    return {
      kind: "unavailable",
      reason: "The home server answered, but not with the papers list.",
    };
  }
  return { kind: "listed", fileNames };
}

/**
 * The server's message for a refusal: its `error` text (the 503 names the folder), or the status when it sent none.
 *
 * @param body The parsed error body.
 * @param status The HTTP status of the refusal.
 */
function refusalReason(body: unknown, status: number): string {
  return errorTextOf(body) ?? `The home server answered with status ${status}.`;
}

/**
 * The `error` text of a refusal's body, or undefined when the body has none.
 *
 * @param body The parsed error body.
 */
function errorTextOf(body: unknown): string | undefined {
  if (!isObject(body) || !("error" in body)) return undefined;
  return typeof body.error === "string" ? body.error : undefined;
}

/**
 * The file names from a list answer `{ files: string[] }`.
 *
 * @param body The parsed answer.
 * @returns The names; null when the answer is not in that form.
 */
function fileNamesFrom(body: unknown): string[] | null {
  if (!isObject(body) || !("files" in body)) return null;
  if (!Array.isArray(body.files)) return null;
  const fileNames: string[] = [];
  for (const name of body.files) {
    // A name that is not text means the answer is not the list, so the whole answer is refused
    if (typeof name !== "string") return null;
    fileNames.push(name);
  }
  return fileNames;
}

/**
 * Whether a parsed JSON value is an object (an array or a plain object), so its fields can be looked at.
 *
 * @param value Any parsed JSON value.
 */
function isObject(value: unknown): value is object {
  return value !== null && typeof value === "object";
}
