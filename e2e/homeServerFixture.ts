/**
 * A test that runs the built app (`dist/`) behind the real home server (server/), the way `npm run home` serves it:
 * every test gets its own server on its own port, over an empty temporary data directory, so tests share nothing and
 * can run in parallel. The test's `page` opens that server's address. Ports 4192-4199 are the test ports (4190 is
 * blocked by browsers), one per worker.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test as base } from "@playwright/test";
import { openCatalogueFile } from "../server/catalogueFile";
import { createRequestHandler } from "../server/requestHandler";

const FIRST_TEST_PORT = 4192;
const TEST_PORT_COUNT = 8;
const BODY_LIMIT_BYTES = 32 * 1024 * 1024;

/** The running server a test talks to. */
export type RunningHomeServer = {
  /** The address to open, e.g. "http://127.0.0.1:4192/". */
  url: string;
};

export const test = base.extend<{ homeServer: RunningHomeServer }>({
  homeServer: async ({}, use, testInfo) => {
    const port = FIRST_TEST_PORT + (testInfo.parallelIndex % TEST_PORT_COUNT);
    const dataDirectory = await mkdtemp(join(tmpdir(), "study-catalogue-e2e-"));
    const catalogueFile = await openCatalogueFile(dataDirectory);
    const server = createServer(
      createRequestHandler({
        catalogueFile,
        distDirectory: resolve("dist"),
        bodyLimitBytes: BODY_LIMIT_BYTES,
        log: () => {},
      }),
    );
    await new Promise<void>((done) => server.listen(port, "127.0.0.1", done));
    try {
      await use({ url: `http://127.0.0.1:${port}/` });
    } finally {
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
      await rm(dataDirectory, { recursive: true, force: true });
    }
  },

  baseURL: async ({ homeServer }, use) => {
    await use(homeServer.url);
  },
});

export { expect } from "@playwright/test";
