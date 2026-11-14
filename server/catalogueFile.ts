/**
 * The catalogue on disk: one data file holding the catalogue and its revision, and a `versions/` folder beside it
 * with a copy of every recent save (see versionRetention.ts). Every save checks the sender's base revision against
 * the stored one, validates the catalogue with the app's own parser (src/catalogue/homeServerProtocol.ts), and
 * writes atomically. Saves run one at a time, so the check and the write cannot interleave.
 */
import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { newCatalogue } from "../src/catalogue/catalogue";
import {
  numberedCatalogueText,
  readNumberedCatalogue,
  type NumberedCatalogue,
} from "../src/catalogue/homeServerProtocol";
import type { Catalogue } from "../src/catalogue/catalogue";
import { writeFileAtomically, type AtomicWriteFileSystem } from "./atomicWrite";
import { versionFileName, versionsToDelete } from "./versionRetention";

/** The data file's name inside the data directory. */
export const DATA_FILE_NAME = "catalogue.json";

/** The folder of earlier saves, inside the data directory. */
export const VERSIONS_FOLDER_NAME = "versions";

/** What a save came to: it was written, or the sender was working from an out-of-date copy. */
export type SaveResult =
  | { kind: "saved"; revision: number }
  | { kind: "conflict"; current: NumberedCatalogue };

/** The catalogue file's operations. */
export type CatalogueFile = {
  /** The stored copy: revision 0 and an empty catalogue when nothing has been saved yet. Throws if the file is unreadable. */
  read(): Promise<NumberedCatalogue>;

  /** Saves the catalogue when `baseRevision` is the stored revision; otherwise changes nothing and says so. */
  save(baseRevision: number, catalogue: Catalogue): Promise<SaveResult>;
};

/** Settings of a catalogue file that tests replace. */
export type CatalogueFileOptions = {
  /** The clock; defaults to the real time. */
  now?: () => Date;
  /** Replaces the atomic write's rename, to make a write fail. */
  fileSystem?: AtomicWriteFileSystem;
};

/**
 * The catalogue file in a data directory, creating the directory and its versions folder when missing.
 *
 * @param dataDirectory Where the data file and the versions folder live.
 * @param options Test replacements; omit in the real server.
 */
export async function openCatalogueFile(
  dataDirectory: string,
  options: CatalogueFileOptions = {},
): Promise<CatalogueFile> {
  const now = options.now ?? (() => new Date());
  const dataPath = join(dataDirectory, DATA_FILE_NAME);
  const versionsPath = join(dataDirectory, VERSIONS_FOLDER_NAME);
  await mkdir(versionsPath, { recursive: true });

  /** The end of the queue of saves, so each waits for the one before. */
  let previousSave: Promise<unknown> = Promise.resolve();

  /** Runs this save after every earlier one, whether they worked or not. */
  function queueSave(
    baseRevision: number,
    catalogue: Catalogue,
  ): Promise<SaveResult> {
    const thisSave = previousSave.then(() => saveNow(baseRevision, catalogue));
    previousSave = thisSave.catch(() => undefined);
    return thisSave;
  }

  /** The check, write and version copy of one save. */
  async function saveNow(
    baseRevision: number,
    catalogue: Catalogue,
  ): Promise<SaveResult> {
    const current = await readStoredCopy(dataPath);
    if (current.revision !== baseRevision) return { kind: "conflict", current };
    const saved = { revision: current.revision + 1, catalogue };
    const text = numberedCatalogueText(saved);
    await writeFileAtomically(dataPath, text, options.fileSystem);
    await keepVersion(versionsPath, saved.revision, text, now());
    return { kind: "saved", revision: saved.revision };
  }

  return {
    read: () => readStoredCopy(dataPath),
    save: queueSave,
  };
}

/** The copy in the data file; revision 0 and a new catalogue when there is no file. */
async function readStoredCopy(dataPath: string): Promise<NumberedCatalogue> {
  let text: string;
  try {
    text = await readFile(dataPath, "utf8");
  } catch (error) {
    if (isMissingFile(error)) return { revision: 0, catalogue: newCatalogue() };
    throw error;
  }
  const result = readNumberedCatalogue(parseJson(text, dataPath));
  if (result.kind === "invalid")
    throw new Error(
      `${dataPath} is not a readable catalogue: ${result.problem}`,
    );
  return result.message;
}

/** The parsed JSON, or an error naming the file when it is not JSON. */
function parseJson(text: string, path: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }
}

/** Whether the error is Node's "no such file". */
function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/**
 * Copies the save into the versions folder, then prunes. Best effort: the save itself is already safely on disk, so
 * a failure here is reported on the error stream and does not fail the request.
 */
async function keepVersion(
  versionsPath: string,
  revision: number,
  text: string,
  savedAt: Date,
): Promise<void> {
  try {
    await writeFileAtomically(
      join(versionsPath, versionFileName(savedAt, revision)),
      text,
    );
    const names = await readdir(versionsPath);
    for (const name of versionsToDelete(names, savedAt)) {
      await rm(join(versionsPath, name), { force: true });
    }
  } catch (error) {
    console.error("Could not keep a version of the save:", error);
  }
}
