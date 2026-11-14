/**
 * Keeping the catalogue on the home server. Changes are handed over one after another and saved by a single worker,
 * so saves are applied in order and never overlap; edits made in quick succession are saved together after a short
 * pause. Each save names the server revision it is based on:
 *
 * - If the server has moved on (another device saved), the save is refused with the server's copy. That copy is
 *   merged with ours by the same rules as adding a backup (catalogue/backupMerge.ts: the newer edit wins per study,
 *   tags are matched), the person is told, and the merged catalogue is saved.
 * - If the server cannot be reached, the changes stay in memory, the person is warned, and the save is retried
 *   until it works; no edit is ever dropped.
 *
 * Known limit of merging: a study or tag that one device deleted comes back when another device that still held it
 * saves, because a merge only ever adds.
 */
import type { Catalogue } from "../catalogue/catalogue";
import { changesAnything, mergeBackup } from "../catalogue/backupMerge";
import type { NumberedCatalogue } from "../catalogue/homeServerProtocol";
import type { CatalogueStorage, SaveEvents } from "./catalogueStorage";
import {
  putServerCopy,
  readServerCopy,
  type FetchFunction,
  type SaveOutcome,
} from "./homeServerClient";

/** When saving happens; tests shorten both. */
export type HomeServerTiming = {
  /** How long to wait after a change for more changes, so a burst of edits is one save. */
  pauseBeforeSavingMilliseconds: number;
  /** How long to wait before trying again after a save failed. */
  retryAfterFailureMilliseconds: number;
};

/** A short pause (rapid edits become one save), and a retry every five seconds while the server is away. */
export const DEFAULT_TIMING: HomeServerTiming = {
  pauseBeforeSavingMilliseconds: 300,
  retryAfterFailureMilliseconds: 5000,
};

/** The notice shown when another device's changes were merged into this one's. */
export const MERGED_NOTICE =
  "Changes from another device were merged into this catalogue.";

/** The newest catalogue that has not reached the server yet, and who to tell about it. */
type WaitingSave = { catalogue: Catalogue; events: SaveEvents };

/**
 * The catalogue kept on the home server.
 *
 * @param startingCopy What the server held when the app opened (see `readServerCopy`).
 * @param fetchFunction The browser's `fetch`; tests pass a fake.
 * @param timing When to save and retry.
 */
export function createHomeServerStorage(
  startingCopy: NumberedCatalogue,
  fetchFunction: FetchFunction,
  timing: HomeServerTiming = DEFAULT_TIMING,
): CatalogueStorage {
  /** The revision of the server copy we know of; every save is based on it. */
  let knownRevision = startingCopy.revision;
  /** Changes not yet on the server; null when everything is saved. Newer changes replace older ones in it. */
  let waiting: WaitingSave | null = null;
  /** Whether the worker is in the middle of its loop; a second worker would break the order of saves. */
  let isWorking = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  /** Runs the worker after the delay, replacing a delayed run already set. */
  function scheduleWork(delayMilliseconds: number): void {
    clearTimeout(timer);
    timer = setTimeout(() => void work(), delayMilliseconds);
  }

  /** Saves waiting changes until none are left; stops and schedules a retry when a save fails. */
  async function work(): Promise<void> {
    if (isWorking) return;
    isWorking = true;
    try {
      while (waiting !== null) {
        const succeeded = await saveWaitingChanges();
        if (!succeeded) {
          scheduleWork(timing.retryAfterFailureMilliseconds);
          return;
        }
      }
    } finally {
      isWorking = false;
    }
  }

  /** One save attempt of the waiting changes. Returns whether the server answered (saved or refused as a conflict). */
  async function saveWaitingChanges(): Promise<boolean> {
    const sent = waiting;
    if (sent === null) return true;
    const outcome = await putServerCopy(
      fetchFunction,
      knownRevision,
      sent.catalogue,
    );
    return applyOutcome(outcome, sent);
  }

  /** Records what the server said about a save of `sent`; false when the save has to be tried again later. */
  function applyOutcome(outcome: SaveOutcome, sent: WaitingSave): boolean {
    if (outcome.kind === "failed") {
      sent.events.reportSaveProblem(unreachableMessage(outcome.reason));
      return false;
    }
    if (outcome.kind === "conflict") {
      mergeServerCopyIntoWaitingChanges(outcome.current, sent.events);
      return true;
    }
    knownRevision = outcome.revision;
    // Edits made while this save was on its way stay waiting: they are a different catalogue object
    if (waiting?.catalogue === sent.catalogue) waiting = null;
    sent.events.reportSaveProblem(null);
    return true;
  }

  /** Merges the server's newer copy with the waiting changes; the next loop saves the result on top of it. */
  function mergeServerCopyIntoWaitingChanges(
    serverCopy: NumberedCatalogue,
    events: SaveEvents,
  ): void {
    // The newest waiting catalogue, which may hold edits made after the refused save was sent
    const ours = waiting?.catalogue;
    if (ours === undefined) return;
    const merge = mergeBackup(ours, serverCopy.catalogue);
    knownRevision = serverCopy.revision;
    waiting = { catalogue: merge.catalogue, events };
    const notice = changesAnything(merge.summary) ? MERGED_NOTICE : null;
    events.adoptCatalogue(merge.catalogue, notice);
  }

  /** Reads the server's copy and adopts it when it is newer, unless changes are waiting or being saved. */
  async function refresh(events: SaveEvents): Promise<void> {
    if (waiting !== null || isWorking) {
      // Visiting the page again is a good moment to retry a save that failed
      if (waiting !== null && !isWorking) scheduleWork(0);
      return;
    }
    const serverCopy = await readServerCopy(fetchFunction);
    // An edit made while the read was on its way is newer than what was read
    const isStillIdle = waiting === null && !isWorking;
    if (serverCopy === null || !isStillIdle) return;
    if (serverCopy.revision === knownRevision) return;
    knownRevision = serverCopy.revision;
    events.adoptCatalogue(serverCopy.catalogue, null);
  }

  return {
    location: "homeServer",
    load: () => ({ kind: "loaded", catalogue: startingCopy.catalogue }),
    save(catalogue, events) {
      waiting = { catalogue, events };
      scheduleWork(timing.pauseBeforeSavingMilliseconds);
    },
    refresh,
  };
}

/** The warning for changes that did not reach the server. */
function unreachableMessage(reason: string): string {
  return `Your latest changes have not reached the home server (${reason}). They are only in this page for now: keep it open while the app keeps trying.`;
}
