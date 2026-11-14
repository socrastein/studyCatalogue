/**
 * Keeping the catalogue in the browser's localStorage, the way the app always has: saved synchronously on every
 * change, unreadable saved data reported and left untouched, and a failed write (the quota is full, or storage is
 * blocked) reported rather than hidden.
 */
import { parseCatalogue, serializeCatalogue } from "../catalogue/serialization";
import type { Catalogue } from "../catalogue/catalogue";
import type { CatalogueStorage, StoredCatalogue } from "./catalogueStorage";

/** The localStorage key the catalogue is saved under. */
export const STORAGE_KEY = "studyCatalogue";

/**
 * The catalogue kept in the given storage.
 *
 * @param storage localStorage in the app; tests pass their own.
 */
export function createBrowserStorage(storage: Storage): CatalogueStorage {
  return {
    location: "browser",
    load: () => readStoredCatalogue(storage),
    save(catalogue, events) {
      events.reportSaveProblem(writeCatalogue(storage, catalogue));
    },
    // Nothing else changes the browser's copy while the page is open, so there is nothing to fetch
    refresh: () => Promise.resolve(),
  };
}

/**
 * What the storage holds: nothing on a first visit, the catalogue when it reads cleanly, and the problem with the
 * raw text when it does not.
 */
function readStoredCatalogue(storage: Storage): StoredCatalogue {
  const rawText = storage.getItem(STORAGE_KEY);
  if (rawText === null) return { kind: "empty" };
  const result = parseCatalogue(rawText);
  if (result.kind === "parsed")
    return { kind: "loaded", catalogue: result.catalogue };
  return { kind: "unreadable", problem: { message: result.problem, rawText } };
}

/**
 * Writes the catalogue to storage.
 *
 * @returns null when it saved; otherwise a message saying the changes are not saved and why.
 */
function writeCatalogue(storage: Storage, catalogue: Catalogue): string | null {
  try {
    storage.setItem(STORAGE_KEY, serializeCatalogue(catalogue));
    return null;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return `Your latest changes could not be saved and will be lost when the page reloads (${reason}).`;
  }
}
