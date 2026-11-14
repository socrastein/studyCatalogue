/**
 * Tests for choosing the storage at startup: the home server only when it gives a well-formed answer, and a warning
 * only for an origin that was a home server on an earlier visit and does not answer now.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createFakeHomeServer } from "./fakeHomeServer";
import { chooseCatalogueStorage, HOME_SERVER_SEEN_KEY } from "./startCatalogue";

/** A fetch that answers with the body and status. */
function answering(body: string, status = 200) {
  return () => Promise.resolve(new Response(body, { status }));
}

beforeEach(() => {
  localStorage.clear();
});

describe("choosing where the catalogue lives", () => {
  it("is the home server when it answers with a catalogue", async () => {
    const server = createFakeHomeServer();
    const { storage } = await chooseCatalogueStorage(
      server.fetch,
      localStorage,
    );
    expect(storage.location).toBe("homeServer");
  });

  it("is the browser when the address is a 404, as on a static host", async () => {
    const { storage } = await chooseCatalogueStorage(
      answering("Not found", 404),
      localStorage,
    );
    expect(storage.location).toBe("browser");
  });

  it("is the browser when a dev server answers with the app's own page", async () => {
    const { storage } = await chooseCatalogueStorage(
      answering("<!doctype html><html></html>"),
      localStorage,
    );
    expect(storage.location).toBe("browser");
  });

  it("is the browser when the answer is JSON of another shape", async () => {
    const { storage } = await chooseCatalogueStorage(
      answering('{"revision":1}'),
      localStorage,
    );
    expect(storage.location).toBe("browser");
  });

  it("is the browser when the network is down", async () => {
    const server = createFakeHomeServer();
    server.isOffline = true;
    const { storage } = await chooseCatalogueStorage(
      server.fetch,
      localStorage,
    );
    expect(storage.location).toBe("browser");
  });
});

describe("warning that the home server is missing", () => {
  it("stays silent on plain dev-server use, where no home server was ever seen", async () => {
    const server = createFakeHomeServer();
    server.isOffline = true;
    const choice = await chooseCatalogueStorage(server.fetch, localStorage);
    expect(choice.isHomeServerMissing).toBe(false);

    const devServer = await chooseCatalogueStorage(
      answering("<!doctype html><html></html>"),
      localStorage,
    );
    expect(devServer.isHomeServerMissing).toBe(false);
  });

  it("remembers that the origin answered as a home server", async () => {
    await chooseCatalogueStorage(createFakeHomeServer().fetch, localStorage);
    expect(localStorage.getItem(HOME_SERVER_SEEN_KEY)).toBe("true");
  });

  it("warns when an origin that was a home server does not answer now", async () => {
    await chooseCatalogueStorage(createFakeHomeServer().fetch, localStorage);
    const down = createFakeHomeServer();
    down.isOffline = true;

    const choice = await chooseCatalogueStorage(down.fetch, localStorage);

    expect(choice.storage.location).toBe("browser");
    expect(choice.isHomeServerMissing).toBe(true);
  });

  it("warns for a server error too, since a home server that is down may answer 502 through a proxy", async () => {
    await chooseCatalogueStorage(createFakeHomeServer().fetch, localStorage);
    const choice = await chooseCatalogueStorage(
      answering("Bad gateway", 502),
      localStorage,
    );
    expect(choice.isHomeServerMissing).toBe(true);
  });

  it("stops warning once the address answers as another site would", async () => {
    await chooseCatalogueStorage(createFakeHomeServer().fetch, localStorage);
    const staticHost = await chooseCatalogueStorage(
      answering("Not found", 404),
      localStorage,
    );
    expect(staticHost.isHomeServerMissing).toBe(false);
    expect(localStorage.getItem(HOME_SERVER_SEEN_KEY)).toBeNull();
  });

  it("does not warn once the home server answers again", async () => {
    await chooseCatalogueStorage(createFakeHomeServer().fetch, localStorage);
    const choice = await chooseCatalogueStorage(
      createFakeHomeServer().fetch,
      localStorage,
    );
    expect(choice.isHomeServerMissing).toBe(false);
  });
});
