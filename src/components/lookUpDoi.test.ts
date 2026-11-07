/**
 * Tests for the Crossref lookup's outcomes, with fetch replaced so no request leaves the machine.
 */
import { describe, expect, it } from "vitest";
import { lookUpDoi } from "./lookUpDoi";

/** A fetch that answers every request with the given status and JSON body, and records the URL asked for. */
function fakeFetch(status: number, body: unknown = {}) {
  const requested: string[] = [];
  const fetchFunction = async (url: RequestInfo | URL) => {
    requested.push(String(url));
    return new Response(JSON.stringify(body), { status });
  };
  return { fetchFunction: fetchFunction as typeof fetch, requested };
}

describe("lookUpDoi", () => {
  it("asks Crossref for the DOI and returns the record's fields", async () => {
    const { fetchFunction, requested } = fakeFetch(200, {
      message: { title: ["A title"] },
    });
    const result = await lookUpDoi("10.1000/a(b)", fetchFunction);
    expect(result).toEqual({ kind: "found", fields: { title: "A title" } });
    expect(requested).toEqual([
      "https://api.crossref.org/works/10.1000%2Fa(b)",
    ]);
  });

  it("reports a DOI Crossref does not know", async () => {
    expect(await lookUpDoi("10.1000/x", fakeFetch(404).fetchFunction)).toEqual({
      kind: "notFound",
    });
  });

  it("reports a server error as a failure", async () => {
    expect(await lookUpDoi("10.1000/x", fakeFetch(503).fetchFunction)).toEqual({
      kind: "failed",
    });
  });

  it("reports being offline as a failure", async () => {
    const offline = (async () => {
      throw new TypeError("NetworkError");
    }) as typeof fetch;
    expect(await lookUpDoi("10.1000/x", offline)).toEqual({ kind: "failed" });
  });
});
