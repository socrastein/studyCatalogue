// @vitest-environment node
/**
 * Tests for atomic writing: a failed write leaves the old file whole and no temporary file behind.
 */
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeFileAtomically } from "./atomicWrite";

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "study-catalogue-atomic-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("writing a file atomically", () => {
  it("creates the file and leaves only it in the folder", async () => {
    const path = join(directory, "data.json");
    await writeFileAtomically(path, "new text");
    expect(await readFile(path, "utf8")).toBe("new text");
    expect(await readdir(directory)).toEqual(["data.json"]);
  });

  it("replaces an existing file", async () => {
    const path = join(directory, "data.json");
    await writeFile(path, "old text");
    await writeFileAtomically(path, "new text");
    expect(await readFile(path, "utf8")).toBe("new text");
  });

  it("leaves the old file untouched and no temporary file when the last step fails", async () => {
    const path = join(directory, "data.json");
    await writeFile(path, "old text");
    const failingRename = () => Promise.reject(new Error("disk went away"));
    await expect(
      writeFileAtomically(path, "new text", { rename: failingRename }),
    ).rejects.toThrow("disk went away");
    expect(await readFile(path, "utf8")).toBe("old text");
    expect(await readdir(directory)).toEqual(["data.json"]);
  });
});
