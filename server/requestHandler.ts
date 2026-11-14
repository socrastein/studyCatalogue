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
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    void answer(parts, request, response, path)
      .catch((error: unknown) => answerServerError(response, error))
      .then((status) => {
        const elapsed = Date.now() - startedAt;
        parts.log(`${request.method} ${path} ${status} ${elapsed}ms`);
      });
  };
}

/** Sends the answer for one request and says which status it sent. */
async function answer(
  parts: RequestHandlerParts,
  request: IncomingMessage,
  response: ServerResponse,
  path: string,
): Promise<number> {
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
  let body: string;
  try {
    body = await readBody(request, parts.bodyLimitBytes);
  } catch (error) {
    if (!(error instanceof BodyTooLargeError)) throw error;
    // The rest of the upload is not read, so the connection is closed after the answer
    response.setHeader("Connection", "close");
    return sendJson(
      response,
      413,
      '{"error":"The catalogue is too large to save"}',
    );
  }
  const parsed = readSaveRequest(parseJson(body));
  if (parsed.kind === "invalid")
    return sendJson(response, 400, JSON.stringify({ error: parsed.problem }));
  const { baseRevision, catalogue } = parsed.message;
  const result = await parts.catalogueFile.save(baseRevision, catalogue);
  if (result.kind === "saved")
    return sendJson(
      response,
      200,
      JSON.stringify({ revision: result.revision }),
    );
  return sendJson(response, 409, numberedCatalogueText(result.current));
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
