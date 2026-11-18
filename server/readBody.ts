/**
 * Reading a request's body into text, refusing anything over a size limit before it is all in memory.
 */
import type { IncomingMessage } from "node:http";

/** Thrown when a body is larger than the limit. */
export class BodyTooLargeError extends Error {}

/**
 * The request body as UTF-8 text.
 *
 * @param request The incoming request.
 * @param limitBytes The most bytes accepted.
 * @returns The text, or "" for a request with no body.
 * @throws BodyTooLargeError as soon as the body passes the limit; the rest of it is not read.
 */
export async function readBody(
  request: IncomingMessage,
  limitBytes: number,
): Promise<string> {
  // A missing header means no declared length (0). A header that is not a number gives NaN, which passes this
  // early check; the byte count below still refuses the body, so the limit holds either way
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (declaredLength > limitBytes) throw new BodyTooLargeError();
  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  // Without an encoding set on the request, Node delivers each chunk as a Buffer
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    receivedBytes += buffer.length;
    if (receivedBytes > limitBytes) throw new BodyTooLargeError();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}
