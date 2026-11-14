// @vitest-environment node
/**
 * Tests for the HTTP side of the server, over a real socket on a test port: reading, saving, conflicts, refusals, the
 * body limit, the app's files and the history fallback, and that the log never holds a body.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newCatalogue, type Catalogue } from "../src/catalogue/catalogue";
import {
  readNumberedCatalogue,
  saveRequestText,
} from "../src/catalogue/homeServerProtocol";
import { createStudy } from "../src/catalogue/study";
import { exampleStudyDetails } from "../src/catalogue/testFixtures";
import { openCatalogueFile } from "./catalogueFile";
import { createRequestHandler } from "./requestHandler";

/** The one port these tests use (4190 is on the fetch standard's blocked-port list); the tests in this file run one after another. */
const TEST_PORT = 4191;
const ORIGIN = `http://127.0.0.1:${TEST_PORT}`;
const BODY_LIMIT_BYTES = 20_000;

let directory: string;
let server: Server;
let logLines: string[];

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "study-catalogue-http-"));
  const distDirectory = join(directory, "dist");
  await mkdir(join(distDirectory, "assets"), { recursive: true });
  await writeFile(join(distDirectory, "index.html"), "<p>the app</p>");
  await writeFile(join(distDirectory, "assets", "app-abc.js"), "// script");
  logLines = [];
  const catalogueFile = await openCatalogueFile(join(directory, "data"));
  server = createServer(
    createRequestHandler({
      catalogueFile,
      distDirectory,
      bodyLimitBytes: BODY_LIMIT_BYTES,
      log: (line) => logLines.push(line),
    }),
  );
  await new Promise<void>((done) =>
    server.listen(TEST_PORT, "127.0.0.1", done),
  );
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  await rm(directory, { recursive: true, force: true });
});

/** A catalogue with one study of the given title. */
function catalogueWith(title: string) {
  return {
    ...newCatalogue(),
    studies: [createStudy(exampleStudyDetails({ title }))],
  };
}

/** The numbered catalogue an answer holds, read with the app's own parser (so key order does not matter). */
async function readCopy(response: Response): Promise<unknown> {
  const result = readNumberedCatalogue(await response.json());
  if (result.kind === "invalid") throw new Error(result.problem);
  return result.message;
}

/** PUTs a save request. */
function put(baseRevision: number, catalogue: Catalogue): Promise<Response> {
  const body = saveRequestText({ baseRevision, catalogue });
  return fetch(`${ORIGIN}/api/catalogue`, { method: "PUT", body });
}

describe("reading the catalogue", () => {
  it("answers revision 0 and an empty catalogue before the first save", async () => {
    const response = await fetch(`${ORIGIN}/api/catalogue`);
    expect(response.status).toBe(200);
    expect(await readCopy(response)).toEqual({
      revision: 0,
      catalogue: newCatalogue(),
    });
  });
});

describe("saving the catalogue", () => {
  it("answers the new revision, and the next read returns the saved catalogue", async () => {
    const saved = catalogueWith("Saved");
    const response = await put(0, saved);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ revision: 1 });
    const read = await fetch(`${ORIGIN}/api/catalogue`);
    expect(await readCopy(read)).toEqual({ revision: 1, catalogue: saved });
  });

  it("answers 409 with the current copy for a wrong base revision", async () => {
    const firstCatalogue = catalogueWith("First");
    const first = await put(0, firstCatalogue);
    expect(first.status).toBe(200);
    const stale = await put(0, catalogueWith("Stale"));
    expect(stale.status).toBe(409);
    expect(await readCopy(stale)).toEqual({
      revision: 1,
      catalogue: firstCatalogue,
    });
  });

  it("refuses an invalid catalogue with 400 and the reason, and saves nothing", async () => {
    const body = JSON.stringify({
      baseRevision: 0,
      catalogue: { schemaVersion: 2, studies: [{ title: 1 }], tags: [] },
    });
    const response = await fetch(`${ORIGIN}/api/catalogue`, {
      method: "PUT",
      body,
    });
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain("study 1");
    const read = await fetch(`${ORIGIN}/api/catalogue`);
    expect(((await read.json()) as { revision: number }).revision).toBe(0);
  });

  it("refuses a body that is not JSON with 400", async () => {
    const response = await fetch(`${ORIGIN}/api/catalogue`, {
      method: "PUT",
      body: "not json",
    });
    expect(response.status).toBe(400);
  });

  it("refuses a body over the limit with 413, and a body at the limit is read", async () => {
    const huge = "x".repeat(BODY_LIMIT_BYTES + 1);
    const refused = await fetch(`${ORIGIN}/api/catalogue`, {
      method: "PUT",
      body: huge,
    });
    expect(refused.status).toBe(413);
    // Exactly at the limit the body is read; it is not a catalogue, so it is refused as invalid, not as too large
    const atLimit = await fetch(`${ORIGIN}/api/catalogue`, {
      method: "PUT",
      body: "x".repeat(BODY_LIMIT_BYTES),
    });
    expect(atLimit.status).toBe(400);
  });

  it("answers 405 to other methods", async () => {
    const response = await fetch(`${ORIGIN}/api/catalogue`, {
      method: "DELETE",
    });
    expect(response.status).toBe(405);
  });
});

describe("the app's files", () => {
  it("serves a file that exists", async () => {
    const response = await fetch(`${ORIGIN}/assets/app-abc.js`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("javascript");
    expect(await response.text()).toBe("// script");
  });

  it("answers index.html for a page of the app, so a reload on /settings works", async () => {
    const response = await fetch(`${ORIGIN}/settings`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<p>the app</p>");
    expect(await (await fetch(`${ORIGIN}/studies/abc/edit`)).text()).toBe(
      "<p>the app</p>",
    );
  });

  it("answers 404, not index.html, for a missing file with an extension", async () => {
    const response = await fetch(`${ORIGIN}/assets/missing.js`);
    expect(response.status).toBe(404);
  });

  it("answers 404 for an unknown API address instead of the app", async () => {
    const response = await fetch(`${ORIGIN}/api/other`);
    expect(response.status).toBe(404);
  });

  it("does not serve files outside the app's folder", async () => {
    const response = await fetch(
      `${ORIGIN}/..%2Fdist%2F..%2F..%2Fetc%2Fpasswd`,
    );
    expect(await response.text()).not.toContain("root:");
  });
});

describe("the log", () => {
  it("has one line per request with the method, path and status, and no body", async () => {
    await put(0, catalogueWith("SecretTitleThatMustNotBeLogged"));
    await fetch(`${ORIGIN}/settings`);
    expect(logLines).toHaveLength(2);
    expect(logLines[0]).toMatch(/^PUT \/api\/catalogue 200 \d+ms$/);
    expect(logLines[1]).toMatch(/^GET \/settings 200 \d+ms$/);
    expect(logLines.join("")).not.toContain("SecretTitle");
  });
});
