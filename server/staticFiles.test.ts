// @vitest-environment node
/**
 * Tests for serving the built app: which file a path names, the page fallback for router paths, the cache policy
 * and the failures that must stay loud. Served from a real socket on a test port, like requestHandler.test.ts.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { serveStaticFile } from "./staticFiles";

let directory: string;
let distDirectory: string;
let server: Server;
/** The address of the test server, known once it listens on a free (ephemeral) port. */
let ORIGIN: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "study-catalogue-static-"));
  distDirectory = join(directory, "dist");
  await mkdir(join(distDirectory, "assets"), { recursive: true });
  await writeFile(join(distDirectory, "index.html"), "<p>the app</p>");
  await writeFile(join(distDirectory, "assets", "app-abc.js"), "// script");
  await writeFile(join(distDirectory, "favicon.ico"), "icon");
  server = createServer((request, response) => {
    const urlPath = new URL(request.url ?? "/", ORIGIN).pathname;
    void serveStaticFile(response, distDirectory, urlPath);
  });
  // Port 0 asks the system for any free port, so parallel test files never clash
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address() as AddressInfo;
  ORIGIN = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  await rm(directory, { recursive: true, force: true });
});

describe("serving a file of the built app", () => {
  it("answers a hashed asset with its type and a year-long cache", async () => {
    const response = await fetch(`${ORIGIN}/assets/app-abc.js`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/javascript; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  it("answers an unhashed file, such as the favicon, so the browser re-checks it", async () => {
    const response = await fetch(`${ORIGIN}/favicon.ico`);
    expect(response.headers.get("content-type")).toBe("image/x-icon");
    expect(response.headers.get("cache-control")).toBe("no-cache");
  });

  it("answers index.html for a page of the app, which the router draws", async () => {
    const response = await fetch(`${ORIGIN}/settings`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<p>the app</p>");
  });

  it("answers 404 for a missing file with an extension, not the app's page", async () => {
    const response = await fetch(`${ORIGIN}/assets/gone.js`);
    expect(response.status).toBe(404);
  });
});
