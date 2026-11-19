/**
 * Tests for asking the home server for the papers list: the names when it answers, and a plain reason in every other
 * case (refused, unreachable, not the home server, a list of the wrong shape). Fakes stand in for `fetch`.
 */
import { describe, expect, it } from "vitest";
import { askForPaperFiles } from "./papersClient";

/** A fake `fetch` answering with the given status and body text. */
function answering(status: number, body: string) {
  return async (): Promise<Response> => new Response(body, { status });
}

describe("asking for the papers list", () => {
  it("returns the names the server lists", async () => {
    const answer = await askForPaperFiles(
      answering(
        200,
        JSON.stringify({ files: ["(Watson, 2017) LIFTMOR RCT.pdf"] }),
      ),
    );
    expect(answer).toEqual({
      kind: "listed",
      fileNames: ["(Watson, 2017) LIFTMOR RCT.pdf"],
    });
  });

  it("asks the papers address without caching", async () => {
    const requests: { input: string; init?: RequestInit }[] = [];
    await askForPaperFiles(async (input, init) => {
      requests.push({ input, init });
      return new Response(JSON.stringify({ files: [] }));
    });
    expect(requests[0]?.input).toBe("/api/papers");
    expect(requests[0]?.init?.cache).toBe("no-store");
  });

  it("gives the server's own message when the folder cannot be read, so the page can show it", async () => {
    const message =
      "The papers folder /mnt/Sata500GB/Studies cannot be read (ENOENT). Is the drive mounted?";
    const answer = await askForPaperFiles(
      answering(503, JSON.stringify({ error: message })),
    );
    expect(answer).toEqual({ kind: "unavailable", reason: message });
  });

  it("says the home server did not answer when the request fails", async () => {
    const answer = await askForPaperFiles(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(answer).toMatchObject({ kind: "unavailable" });
    expect(answer.kind === "unavailable" && answer.reason).toContain(
      "did not answer",
    );
  });

  it("says the address is not the home server when it answers with a page instead of JSON", async () => {
    const answer = await askForPaperFiles(
      answering(200, "<!doctype html><p>the app</p>"),
    );
    expect(answer).toMatchObject({ kind: "unavailable" });
    expect(answer.kind === "unavailable" && answer.reason).toContain(
      "did not answer",
    );
  });

  it("refuses an answer that is JSON but not the papers list, rather than listing nothing", async () => {
    const wrongShape = await askForPaperFiles(
      answering(200, JSON.stringify({ files: [42] })),
    );
    expect(wrongShape).toEqual({
      kind: "unavailable",
      reason: "The home server answered, but not with the papers list.",
    });
  });

  it("gives the status when a refusal has no message", async () => {
    const answer = await askForPaperFiles(answering(500, "{}"));
    expect(answer).toEqual({
      kind: "unavailable",
      reason: "The home server answered with status 500.",
    });
  });
});
