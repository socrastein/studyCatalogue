// @vitest-environment node
/**
 * Tests for the papers scan: the PDF names under a folder at any depth, names only, and a folder that cannot be read
 * reported as such rather than as an empty list. Each test uses its own temporary folder with made-up file names.
 */
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listPaperFileNames } from "./papers";

let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "study-catalogue-papers-"));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe("listing the papers", () => {
  it("lists the PDF names under the folder at any depth, sorted, with no folders in the names", async () => {
    await mkdir(join(folder, "1. Hypertrophy"), { recursive: true });
    await mkdir(join(folder, "_fetched", "deeper"), { recursive: true });
    await writeFile(
      join(folder, "1. Hypertrophy", "(Watson, 2017) LIFTMOR RCT.pdf"),
      "",
    );
    await writeFile(
      join(folder, "_fetched", "(Abu Raya, 2023) Neurobiology.pdf"),
      "",
    );
    await writeFile(
      join(folder, "_fetched", "deeper", "(Adams, 2020) Nested Study.pdf"),
      "",
    );
    expect(await listPaperFileNames(folder)).toEqual({
      kind: "listed",
      fileNames: [
        "(Abu Raya, 2023) Neurobiology.pdf",
        "(Adams, 2020) Nested Study.pdf",
        "(Watson, 2017) LIFTMOR RCT.pdf",
      ],
    });
  });

  it("ignores other files, and counts an upper-case extension", async () => {
    await writeFile(join(folder, "deepResearch.md"), "notes");
    await writeFile(join(folder, "(Lee, 2019) Shouting.PDF"), "");
    await writeFile(join(folder, "(Lee, 2019) Notes.pdf.txt"), "");
    expect(await listPaperFileNames(folder)).toEqual({
      kind: "listed",
      fileNames: ["(Lee, 2019) Shouting.PDF"],
    });
  });

  it("lists an empty folder as no files, which is a real answer for a folder that was read", async () => {
    expect(await listPaperFileNames(folder)).toEqual({
      kind: "listed",
      fileNames: [],
    });
  });

  it("reports a missing folder as unreadable, naming the folder, and never as an empty list", async () => {
    const missing = join(folder, "not-mounted");
    const listing = await listPaperFileNames(missing);
    expect(listing).toMatchObject({ kind: "unreadable", folder: missing });
    expect(listing.kind === "unreadable" && listing.reason).toContain("ENOENT");
  });

  it("reports the whole scan as unreadable when a folder inside the tree cannot be read", async () => {
    await writeFile(join(folder, "(Lee, 2019) Shouting.pdf"), "");
    const locked = join(folder, "locked");
    await mkdir(locked);
    await chmod(locked, 0o000);
    try {
      // Only the folder's files it cannot see are lost, so the whole scan says so instead of listing the rest
      expect(await listPaperFileNames(folder)).toMatchObject({
        kind: "unreadable",
        folder,
      });
    } finally {
      // Restored so the cleanup can remove the folder
      await chmod(locked, 0o755);
    }
  });
});
