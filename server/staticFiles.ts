/**
 * Serving the built app (`dist/`). A path that names a file is answered with it; any other path that is not the
 * API's answers index.html, because the app's router (history mode) draws pages like /settings itself.
 */
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import type { ServerResponse } from "node:http";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
};

/**
 * Answers a GET or HEAD for a path outside the API.
 *
 * @param response Where to write the answer.
 * @param distDirectory The built app's folder.
 * @param urlPath The request path, e.g. "/assets/index-abc.js" or "/settings".
 * @returns The status sent: 200, or 404 for a missing file with an extension (so a broken asset link fails loudly
 *   instead of being answered with a page), or 503 when the app has not been built.
 */
export async function serveStaticFile(
  response: ServerResponse,
  distDirectory: string,
  urlPath: string,
): Promise<number> {
  const filePath = fileInside(distDirectory, urlPath);
  if (filePath !== null && (await isFile(filePath)))
    return sendFile(response, filePath);
  const looksLikeAFile = extname(urlPath) !== "";
  if (looksLikeAFile) return sendText(response, 404, "Not found");
  const indexPath = join(distDirectory, "index.html");
  if (await isFile(indexPath)) return sendFile(response, indexPath);
  return sendText(
    response,
    503,
    "The app has not been built yet: run npm run build.",
  );
}

/** The file path for a URL path, or null when it would climb out of the folder (".." tricks). */
function fileInside(distDirectory: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const filePath = normalize(join(distDirectory, decoded));
  const isInside = filePath.startsWith(normalize(distDirectory) + sep);
  return isInside ? filePath : null;
}

/** Whether the path is an existing regular file. */
async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Sends a file with its content type. */
async function sendFile(
  response: ServerResponse,
  filePath: string,
): Promise<number> {
  const body = await readFile(filePath);
  const contentType =
    CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream";
  // Vite puts a hash in the name of every file under assets/, so those never change; anything else (index.html,
  // the favicon) is re-checked, so a new build is picked up
  const isHashed = filePath.includes(`${sep}assets${sep}`);
  const cacheControl = isHashed
    ? "public, max-age=31536000, immutable"
    : "no-cache";
  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": body.length,
    "Cache-Control": cacheControl,
  });
  response.end(body);
  return 200;
}

/** Sends a plain-text answer. */
function sendText(
  response: ServerResponse,
  status: number,
  text: string,
): number {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
  return status;
}
