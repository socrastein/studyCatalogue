/**
 * Tests for choosing the storage at startup: the home server only when it gives a well-formed answer.
 */
import { describe, expect, it } from "vitest";
import { createFakeHomeServer } from "./fakeHomeServer";
import { chooseCatalogueStorage } from "./startCatalogue";

describe("choosing where the catalogue lives", () => {
  it("is the home server when it answers with a catalogue", async () => {
    const server = createFakeHomeServer();
    const storage = await chooseCatalogueStorage(server.fetch, localStorage);
    expect(storage.location).toBe("homeServer");
  });

  it("is the browser when the address is a 404, as on a static host", async () => {
    const storage = await chooseCatalogueStorage(
      () => Promise.resolve(new Response("Not found", { status: 404 })),
      localStorage,
    );
    expect(storage.location).toBe("browser");
  });

  it("is the browser when a dev server answers with the app's own page", async () => {
    const storage = await chooseCatalogueStorage(
      () => Promise.resolve(new Response("<!doctype html><html></html>")),
      localStorage,
    );
    expect(storage.location).toBe("browser");
  });

  it("is the browser when the answer is JSON of another shape", async () => {
    const storage = await chooseCatalogueStorage(
      () => Promise.resolve(new Response('{"revision":1}')),
      localStorage,
    );
    expect(storage.location).toBe("browser");
  });

  it("is the browser when the network is down", async () => {
    const server = createFakeHomeServer();
    server.isOffline = true;
    const storage = await chooseCatalogueStorage(server.fetch, localStorage);
    expect(storage.location).toBe("browser");
  });
});
