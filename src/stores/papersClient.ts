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
 * The answer a response stands for. Its body is read as text first, so a body cut off half way is a reason, not a throw.
 *
 * @param response The home server's response to the list request.
 */
async function answerFrom(response: Response): Promise<PaperFilesAnswer> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    return { kind: "unavailable", reason: NO_HOME_SERVER_REASON };
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    // Not JSON: a dev server's page, or another site, answering the address
    return { kind: "unavailable", reason: NO_HOME_SERVER_REASON };
  }
  if (!response.ok)
    return {
      kind: "unavailable",
      reason: refusalReason(body, response.status),
    };
  const fileNames = fileNamesFrom(body);
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
  const message =
    body !== null && typeof body === "object" && "error" in body
      ? body.error
      : undefined;
  return typeof message === "string"
    ? message
    : `The home server answered with status ${status}.`;
}

/**
 * The file names from a list answer `{ files: string[] }`.
 *
 * @param body The parsed answer.
 * @returns The names; null when the answer is not in that form.
 */
function fileNamesFrom(body: unknown): string[] | null {
  if (body === null || typeof body !== "object" || !("files" in body))
    return null;
  if (!Array.isArray(body.files)) return null;
  const fileNames: string[] = [];
  for (const name of body.files) {
    // A name that is not text means the answer is not the list, so the whole answer is refused
    if (typeof name !== "string") return null;
    fileNames.push(name);
  }
  return fileNames;
}
