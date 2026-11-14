/**
 * Tests for the client's reading and saving: what each server answer becomes.
 */
import { describe, expect, it } from "vitest";
import { newCatalogue } from "../catalogue/catalogue";
import { numberedCatalogueText } from "../catalogue/homeServerProtocol";
import {
  askForServerCopy,
  putServerCopy,
  readServerCopy,
} from "./homeServerClient";

const current = { revision: 3, catalogue: newCatalogue() };

/** A fetch that answers with the body and status. */
function answering(body: string, status = 200) {
  return () => Promise.resolve(new Response(body, { status }));
}

describe("reading the server's copy", () => {
  it("returns the revision and catalogue", async () => {
    const copy = await readServerCopy(
      answering(numberedCatalogueText(current)),
    );
    expect(copy).toEqual(current);
  });

  it("returns null for a server error", async () => {
    expect(await readServerCopy(answering("oops", 500))).toBeNull();
  });
});

describe("asking the app's own address for the catalogue", () => {
  it("is a copy when the answer is a well-formed catalogue", async () => {
    const answer = await askForServerCopy(
      answering(numberedCatalogueText(current)),
    );
    expect(answer).toEqual({ kind: "copy", copy: current });
  });

  it("is not a home server when the address answers 404, as a static host does", async () => {
    expect(await askForServerCopy(answering("Not found", 404))).toEqual({
      kind: "notAHomeServer",
    });
  });

  it("is not a home server when a dev server answers with the app's own page", async () => {
    expect(
      await askForServerCopy(answering("<!doctype html><html></html>")),
    ).toEqual({ kind: "notAHomeServer" });
  });

  it("is not a home server when the JSON is of another shape", async () => {
    expect(await askForServerCopy(answering('{"revision":1}'))).toEqual({
      kind: "notAHomeServer",
    });
  });

  it("is no answer for a server error, so a home server that is down is not mistaken for another site", async () => {
    expect(await askForServerCopy(answering("oops", 502))).toEqual({
      kind: "noAnswer",
    });
  });

  it("is no answer when the network is down", async () => {
    const down = () => Promise.reject(new TypeError("NetworkError"));
    expect(await askForServerCopy(down)).toEqual({ kind: "noAnswer" });
  });

  it("is no answer when the connection drops while the body is read", async () => {
    const brokenBody = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.reject(new TypeError("body cut off")),
      } as unknown as Response);
    expect(await askForServerCopy(brokenBody)).toEqual({ kind: "noAnswer" });
  });
});

describe("saving", () => {
  it("returns the new revision", async () => {
    const outcome = await putServerCopy(
      answering('{"revision":4}'),
      3,
      newCatalogue(),
    );
    expect(outcome).toEqual({ kind: "saved", revision: 4 });
  });

  it("returns the server's copy for a 409", async () => {
    const outcome = await putServerCopy(
      answering(numberedCatalogueText(current), 409),
      1,
      newCatalogue(),
    );
    expect(outcome).toEqual({ kind: "conflict", current });
  });

  it("fails, with the reason, for other statuses and for no connection", async () => {
    const refused = await putServerCopy(
      answering("{}", 400),
      3,
      newCatalogue(),
    );
    expect(refused).toEqual({
      kind: "failed",
      reason: "the server answered 400",
    });
    const offline = await putServerCopy(
      () => Promise.reject(new TypeError("NetworkError")),
      3,
      newCatalogue(),
    );
    expect(offline.kind).toBe("failed");
  });

  it("fails when a 200 does not say the revision", async () => {
    const outcome = await putServerCopy(answering("{}"), 3, newCatalogue());
    expect(outcome.kind).toBe("failed");
  });

  it("sends the base revision and the catalogue as the body of a PUT", async () => {
    let sent: RequestInit | undefined;
    await putServerCopy(
      (_input, init) => {
        sent = init;
        return Promise.resolve(new Response('{"revision":4}'));
      },
      3,
      newCatalogue(),
    );
    expect(sent?.method).toBe("PUT");
    expect(JSON.parse(String(sent?.body))).toMatchObject({ baseRevision: 3 });
  });
});
