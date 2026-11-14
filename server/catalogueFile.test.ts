// @vitest-environment node
/**
 * Tests for the catalogue file: first read, saving with a base revision, conflicts, a failed write, and the versions
 * folder, all in a temporary directory.
 */
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newCatalogue } from "../src/catalogue/catalogue";
import { createStudy } from "../src/catalogue/study";
import { exampleStudyDetails } from "../src/catalogue/testFixtures";
import {
  DATA_FILE_NAME,
  openCatalogueFile,
  VERSIONS_FOLDER_NAME,
} from "./catalogueFile";
import { RECENT_SAVES_KEPT } from "./versionRetention";

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "study-catalogue-file-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

/** A catalogue with one study titled as given. */
function catalogueWith(title: string) {
  const study = createStudy(exampleStudyDetails({ title }));
  return { ...newCatalogue(), studies: [study] };
}

/** The names in the versions folder, oldest first. */
async function versionNames(): Promise<string[]> {
  const names = await readdir(join(directory, VERSIONS_FOLDER_NAME));
  return names.sort();
}

describe("reading before anything is saved", () => {
  it("gives revision 0 and the new catalogue, without creating the data file", async () => {
    const file = await openCatalogueFile(directory);
    expect(await file.read()).toEqual({
      revision: 0,
      catalogue: newCatalogue(),
    });
    expect(await readdir(directory)).toEqual([VERSIONS_FOLDER_NAME]);
  });
});

describe("saving", () => {
  it("stores the catalogue under the next revision and reads it back", async () => {
    const file = await openCatalogueFile(directory);
    const catalogue = catalogueWith("First");
    expect(await file.save(0, catalogue)).toEqual({
      kind: "saved",
      revision: 1,
    });
    expect(await file.read()).toEqual({ revision: 1, catalogue });
  });

  it("survives a restart: a second opening reads what the first saved", async () => {
    const catalogue = catalogueWith("Kept");
    await (await openCatalogueFile(directory)).save(0, catalogue);
    const reopened = await openCatalogueFile(directory);
    expect(await reopened.read()).toEqual({ revision: 1, catalogue });
  });

  it("answers a wrong base revision with the current copy and writes nothing", async () => {
    const file = await openCatalogueFile(directory);
    const current = catalogueWith("Current");
    await file.save(0, current);
    const before = await readFile(join(directory, DATA_FILE_NAME), "utf8");

    const result = await file.save(0, catalogueWith("Stale"));

    expect(result).toEqual({
      kind: "conflict",
      current: { revision: 1, catalogue: current },
    });
    expect(await readFile(join(directory, DATA_FILE_NAME), "utf8")).toBe(
      before,
    );
    expect(await versionNames()).toHaveLength(1);
  });

  it("lets only one of two saves from the same revision win, even when they start together", async () => {
    const file = await openCatalogueFile(directory);
    const results = await Promise.all([
      file.save(0, catalogueWith("A")),
      file.save(0, catalogueWith("B")),
    ]);
    expect(results.map((result) => result.kind).sort()).toEqual([
      "conflict",
      "saved",
    ]);
  });

  it("leaves the old file and revision when the write fails", async () => {
    const failing = {
      rename: () => Promise.reject(new Error("disk went away")),
    };
    const good = await openCatalogueFile(directory);
    const kept = catalogueWith("Kept");
    await good.save(0, kept);

    const broken = await openCatalogueFile(directory, { fileSystem: failing });
    await expect(broken.save(1, catalogueWith("Lost"))).rejects.toThrow(
      "disk went away",
    );

    expect(await good.read()).toEqual({ revision: 1, catalogue: kept });
    const stray = (await readdir(directory)).filter((name) =>
      name.endsWith(".tmp"),
    );
    expect(stray).toEqual([]);
  });
});

describe("an unreadable data file", () => {
  it("is reported and never overwritten", async () => {
    const path = join(directory, DATA_FILE_NAME);
    await writeFile(path, "{broken");
    const file = await openCatalogueFile(directory);
    await expect(file.read()).rejects.toThrow("not valid JSON");
    await expect(file.save(0, catalogueWith("X"))).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe("{broken");
  });
});

describe("the versions folder", () => {
  it("holds a copy of each save, named by time and revision", async () => {
    const times = [
      new Date("2026-11-14T08:00:00.000Z"),
      new Date("2026-11-14T09:00:00.000Z"),
    ];
    const file = await openCatalogueFile(directory, {
      now: () => times.shift() ?? new Date(),
    });
    await file.save(0, catalogueWith("One"));
    await file.save(1, catalogueWith("Two"));
    expect(await versionNames()).toEqual([
      "2026-11-14T08-00-00.000Z-r1.json",
      "2026-11-14T09-00-00.000Z-r2.json",
    ]);
  });

  it("keeps the newest twenty saves of a day and prunes the one before them", async () => {
    let minute = 0;
    const file = await openCatalogueFile(directory, {
      now: () => new Date(Date.UTC(2026, 10, 14, 1, minute++)),
    });
    const catalogue = catalogueWith("Many");
    for (let revision = 0; revision <= RECENT_SAVES_KEPT; revision += 1) {
      await file.save(revision, catalogue);
    }
    const names = await versionNames();
    // 21 saves: the first is neither among the newest twenty nor the last of its day
    expect(names).toHaveLength(RECENT_SAVES_KEPT);
    expect(names[0]).toContain("-r2.json");
  });
});
