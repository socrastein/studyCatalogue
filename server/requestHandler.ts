/**
 * The server's request handler: the catalogue API at /api/catalogue, and the built app for everything else. One log
 * line per request (method, path, status, milliseconds), never a body: a catalogue is the owner's data.
 *
 * There is no authentication, on purpose. The server is meant for a home network behind the router's firewall and is
 * never exposed to the internet; anyone who can reach the port can read and replace the catalogue.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  CATALOGUE_API_PATH,
  numberedCatalogueText,
  readSaveRequest,
  type SaveRequest,
} from "../src/catalogue/homeServerProtocol";
import type { CatalogueFile } from "./catalogueFile";
import { BodyTooLargeError, readBody } from "./readBody";
import { serveStaticFile } from "./staticFiles";

/** What the handler needs: the stored catalogue, the built app, the size limit and where to log. */
export type RequestHandlerParts = {
  catalogueFile: CatalogueFile;
  distDirectory: string;
  bodyLimitBytes: number;
  log: (line: string) => void;
};

/**
 * The handler to give to `http.createServer`.
 *
 * @param parts The stored catalogue, the built app's folder, the body size limit and the logger.
 */
export function createRequestHandler(
  parts: RequestHandlerParts,
): (request: IncomingMessage, response: ServerResponse) => void {
  return (request, response) => {
    const startedAt = Date.now();
    const path = pathOf(request);
    void answer(parts, request, response)
      .catch((error: unknown) => answerServerError(response, error))
      .then((status) => {
        const elapsed = Date.now() - startedAt;
        parts.log(`${request.method} ${path} ${status} ${elapsed}ms`);
      });
  };
}

/** The path of a request's address, without the query string. */
function pathOf(request: IncomingMessage): string {
  return new URL(request.url ?? "/", "http://localhost").pathname;
}

/** Sends the answer for one request and says which status it sent. */
async function answer(
  parts: RequestHandlerParts,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<number> {
  const path = pathOf(request);
  if (path === CATALOGUE_API_PATH)
    return answerCatalogue(parts, request, response);
  if (path.startsWith("/api/"))
    return sendJson(response, 404, '{"error":"No such API address"}');
  const isReading = request.method === "GET" || request.method === "HEAD";
  if (!isReading)
    return sendJson(response, 405, '{"error":"Method not allowed"}');
  return serveStaticFile(response, parts.distDirectory, path);
}

/** The catalogue API: GET reads, PUT saves. */
async function answerCatalogue(
  parts: RequestHandlerParts,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<number> {
  if (request.method === "GET") {
    const current = await parts.catalogueFile.read();
    return sendJson(response, 200, numberedCatalogueText(current));
  }
  if (request.method === "PUT") return answerSave(parts, request, response);
  return sendJson(response, 405, '{"error":"Method not allowed"}');
}

/** A save: refuse a body that is too large, unreadable or invalid; otherwise save, or hand back the newer copy. */
async function answerSave(
  parts: RequestHandlerParts,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<number> {
  const body = await readBodyWithinLimit(request, parts.bodyLimitBytes);
  if (body === null) {
    // The rest of the upload is not read, so the connection is closed after the answer
    response.setHeader("Connection", "close");
    const tooLarge = '{"error":"The catalogue is too large to save"}';
    return sendJson(response, 413, tooLarge);
  }
  const parsed = readSaveRequest(parseJson(body));
  if (parsed.kind === "invalid")
    return sendJson(response, 400, JSON.stringify({ error: parsed.problem }));
  return saveAndAnswer(parts, parsed.message, response);
}

/** Saves a checked request and answers with the new revision, or with 409 and the current copy when it was stale. */
async function saveAndAnswer(
  parts: RequestHandlerParts,
  request: SaveRequest,
  response: ServerResponse,
): Promise<number> {
  const result = await parts.catalogueFile.save(
    request.baseRevision,
    request.catalogue,
  );
  if (result.kind === "saved") {
    const answer = JSON.stringify({ revision: result.revision });
    return sendJson(response, 200, answer);
  }
  return sendJson(response, 409, numberedCatalogueText(result.current));
}

/** The request body, or null when it is larger than the limit. */
async function readBodyWithinLimit(
  request: IncomingMessage,
  limitBytes: number,
): Promise<string | null> {
  try {
    return await readBody(request, limitBytes);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return null;
    throw error;
  }
}

/** The parsed JSON, or undefined when the text is not JSON (which the save check then refuses). */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Answers 500 for an unexpected failure, once, without detail the client could not use; the log has the error. */
function answerServerError(response: ServerResponse, error: unknown): number {
  console.error("Request failed:", error);
  if (response.headersSent) {
    response.destroy();
    return 500;
  }
  return sendJson(response, 500, '{"error":"The server could not do that"}');
}

/** Sends a JSON answer with no caching and says its status. */
function sendJson(
  response: ServerResponse,
  status: number,
  body: string,
): number {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(body);
  return status;
}
