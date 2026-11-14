/**
 * The boundary between the catalogue store and wherever the catalogue is kept. The store holds the state and knows
 * nothing about storage; a `CatalogueStorage` loads what was kept and saves each change, and tells the store about
 * trouble or newer data through `SaveEvents`. There are two: this browser's localStorage (browserStorage.ts) and
 * the home server (homeServerStorage.ts); the app picks one before it mounts (startCatalogue.ts).
 */
import type { Catalogue } from "../catalogue/catalogue";

/** Where the catalogue is kept, as the person is told in Settings. */
export type StorageLocation = "browser" | "homeServer";

/** Saved data the app could not read, kept untouched until the person decides what to do with it. */
export type LoadProblem = { message: string; rawText: string };

/** What storage held when the app started. */
export type StoredCatalogue =
  | { kind: "empty" }
  | { kind: "loaded"; catalogue: Catalogue }
  | { kind: "unreadable"; problem: LoadProblem };

/** How storage reaches the store after `save` or `refresh` returns: at once, or later when a save finishes. */
export type SaveEvents = {
  /** Records that changes are not saved (the message says why), or, with null, that all changes are saved. */
  reportSaveProblem(message: string | null): void;

  /**
   * Makes the given catalogue the store's, because storage holds something newer than the store did.
   *
   * @param notice A sentence telling the person what happened, or null to change silently.
   */
  adoptCatalogue(catalogue: Catalogue, notice: string | null): void;
};

export type CatalogueStorage = {
  /** Where this storage keeps the catalogue. */
  location: StorageLocation;

  /** What was kept when the app started. */
  load(): StoredCatalogue;

  /**
   * Takes the whole catalogue for saving after a change. Returns at once; the outcome comes through `events`. Saves
   * are applied in the order they were handed over, and the newest catalogue always ends up saved.
   */
  save(catalogue: Catalogue, events: SaveEvents): void;

  /** Fetches what storage holds now and adopts it through `events` if it is newer; retries unsaved changes first. */
  refresh(events: SaveEvents): Promise<void>;
};
