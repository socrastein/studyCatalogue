/**
 * The catalogue's live state for the whole app. Views read `catalogue` reactively and change it only through the
 * store's actions, each of which saves straight away through a `CatalogueStorage` (catalogueStorage.ts): the
 * browser's localStorage, or the home server when the app is served by it.
 *
 * Two problems are surfaced rather than hidden:
 * - Saved data that cannot be read is never overwritten: the app runs on an empty catalogue without saving, and
 *   `loadProblem` keeps the raw text so the person can download it before choosing to start over.
 * - A save that fails (the browser's quota is full, or the home server cannot be reached) leaves the change in
 *   memory and sets `saveProblem`, so the person knows it is not saved yet.
 */
import { reactive, readonly, type DeepReadonly } from "vue";
import { newCatalogue, type Catalogue } from "../catalogue/catalogue";
import {
  createStudy,
  updateStudy,
  type Study,
  type StudyDetails,
} from "../catalogue/study";
import {
  approveSummary,
  editSummaryText,
  rejectSummary,
  sendSummaryBackToReview,
} from "../catalogue/summary";
import {
  deleteTag,
  editTag,
  mergeTags,
  type TagChanges,
  type TagEditResult,
} from "../catalogue/tagEdits";
import { createTag, findTagByName, type Tag } from "../catalogue/tags";
import { createBrowserStorage, STORAGE_KEY } from "./browserStorage";
import type {
  CatalogueStorage,
  LoadProblem,
  SaveEvents,
  StorageLocation,
  StoredCatalogue,
} from "./catalogueStorage";
import { showToast } from "./notice";

// Where the catalogue is kept moved to browserStorage.ts and catalogueStorage.ts; the browser tests read it from here
export { STORAGE_KEY };
export type { LoadProblem };

type StoreState = {
  catalogue: Catalogue;
  loadProblem: LoadProblem | null;
  saveProblem: string | null;
  /** Where the catalogue is kept, for Settings to say. */
  storageLocation: StorageLocation;
};

/** The store's interface: read the state, change it only through the actions. */
export type CatalogueStore = {
  /** Read-only view of the state; views read it reactively. */
  state: DeepReadonly<StoreState>;
} & StudyActions &
  SummaryActions &
  TagActions & {
    /**
     * Replaces the whole catalogue, as an import does, and saves it. Also clears a load problem: the person has
     * chosen what the catalogue should be, so the unreadable data may now be overwritten.
     */
    replaceCatalogue(catalogue: Catalogue): void;

    /**
     * Picks up what storage holds now, when it is newer than what the app shows (the home server's copy after another
     * device saved) and no change of ours is waiting; otherwise retries the waiting changes. Does nothing for the
     * browser's storage. Called when the page becomes visible again.
     */
    refresh(): Promise<void>;
  };

type StudyActions = {
  /**
   * Adds a new study made from the form's details.
   *
   * @returns The saved study, with its new id.
   */
  addStudy(details: StudyDetails): Study;

  /**
   * Replaces a study's details with edited ones.
   *
   * @returns The updated study; undefined when no study has that id.
   */
  editStudy(id: string, details: StudyDetails): Study | undefined;

  /** Removes a study; does nothing when no study has that id. */
  deleteStudy(id: string): void;
};

type SummaryActions = {
  /** Approves a study's draft summary (see `approveSummary` in summary.ts); does nothing when there is none. */
  approveSummary(studyId: string): void;

  /** Changes the words of a study's summary, draft or approved (see `editSummaryText` in summary.ts). */
  editSummary(studyId: string, text: string): void;

  /** Clears the approval of a study's summary so it is a draft in the review queue again (see `sendSummaryBackToReview`). */
  sendSummaryBackToReview(studyId: string): void;

  /** Deletes a study's summary, as rejecting a draft does (see `rejectSummary` in summary.ts). */
  rejectSummary(studyId: string): void;
};

type TagActions = {
  /**
   * The tag with the given name, creating it as a top-level tag if none exists. An existing tag is found by name or
   * alias, ignoring case, so typing "hypertrophy" reuses "Hypertrophy".
   *
   * @returns The existing or new tag.
   */
  findOrCreateTag(name: string): Tag;

  /**
   * Renames a tag and replaces its aliases and parents (see `editTag` in tagEdits.ts).
   *
   * @returns null when saved; otherwise why the change was refused, for the person.
   */
  editTag(tagId: string, changes: TagChanges): string | null;

  /**
   * Merges one tag into another (see `mergeTags` in tagEdits.ts).
   *
   * @returns null when merged; otherwise why it was refused, for the person.
   */
  mergeTags(mergedId: string, keptId: string): string | null;

  /** Deletes a tag, removing it from studies and moving its subtopics up (see `deleteTag` in tagEdits.ts). */
  deleteTag(tagId: string): void;
};

/**
 * A catalogue store saving to the given browser storage, starting from what it holds. Tests make their own with a
 * fresh storage; the app uses `useCatalogue`.
 *
 * @param storage The browser's localStorage, or a stand-in.
 */
export function createCatalogueStore(storage: Storage): CatalogueStore {
  return createCatalogueStoreOn(createBrowserStorage(storage));
}

/**
 * A catalogue store saving to the given storage, starting from what it holds.
 *
 * @param storage Where the catalogue is kept: the browser's, or the home server's.
 */
export function createCatalogueStoreOn(
  storage: CatalogueStorage,
): CatalogueStore {
  const state = reactive<StoreState>(loadState(storage));
  const events = saveEventsFor(state);

  /** Saves the current catalogue, unless unreadable saved data must be kept. */
  function save(): void {
    if (state.loadProblem) return;
    storage.save(state.catalogue, events);
  }

  /** Makes the given catalogue the current one and saves it: the one way every action changes the catalogue. */
  function commit(catalogue: Catalogue): void {
    state.catalogue = catalogue;
    save();
  }

  return {
    state: readonly(state),
    ...studyActions(state, commit),
    ...summaryActions(state, commit),
    ...tagActions(state, commit),
    replaceCatalogue(catalogue) {
      // Cleared first, so the commit's save may overwrite the unreadable data the person has chosen to replace
      state.loadProblem = null;
      commit(catalogue);
    },
    refresh: () => storage.refresh(events),
  };
}

/**
 * How storage tells the store about a finished save, or about a newer catalogue, by changing the state. News the
 * person did not ask for (a save that works again, another device's changes) goes to the bottom toast.
 */
function saveEventsFor(state: StoreState): SaveEvents {
  return {
    reportSaveProblem(message) {
      const hadProblem = state.saveProblem !== null;
      state.saveProblem = message;
      // The red banner disappears when the problem does; the toast says why
      if (hadProblem && message === null) showToast(nowSavedText(state));
    },
    adoptCatalogue(catalogue, notice) {
      state.catalogue = catalogue;
      if (notice !== null) showToast(notice);
    },
  };
}

/** The toast after a save problem cleared, naming where the changes are now kept. */
function nowSavedText(state: StoreState): string {
  return state.storageLocation === "homeServer"
    ? "Your changes are now saved on the home server."
    : "Your changes are now saved in this browser.";
}

/** Commits a changed catalogue; see `commit` in createCatalogueStore. */
type Commit = (catalogue: Catalogue) => void;

/** The actions that add, edit and delete studies. */
function studyActions(state: StoreState, commit: Commit): StudyActions {
  return {
    addStudy(details) {
      const study = createStudy(details);
      const studies = [...state.catalogue.studies, study];
      commit({ ...state.catalogue, studies });
      return study;
    },

    editStudy(id, details) {
      const existing = state.catalogue.studies.find((study) => study.id === id);
      if (existing === undefined) return undefined;
      const updated = updateStudy(existing, details);
      const studies = state.catalogue.studies.map((study) =>
        study.id === id ? updated : study,
      );
      commit({ ...state.catalogue, studies });
      return updated;
    },

    deleteStudy(id) {
      const studies = state.catalogue.studies.filter(
        (study) => study.id !== id,
      );
      commit({ ...state.catalogue, studies });
    },
  };
}

/** The actions on studies' summaries. */
function summaryActions(state: StoreState, commit: Commit): SummaryActions {
  /** Replaces the study with the changed one; does nothing when no study has that id. */
  function changeStudy(id: string, change: (study: Study) => Study): void {
    const studies = state.catalogue.studies.map((study) =>
      study.id === id ? change(study) : study,
    );
    commit({ ...state.catalogue, studies });
  }

  return {
    approveSummary(studyId) {
      changeStudy(studyId, (study) => approveSummary(study));
    },

    editSummary(studyId, text) {
      changeStudy(studyId, (study) => editSummaryText(study, text));
    },

    sendSummaryBackToReview(studyId) {
      changeStudy(studyId, (study) => sendSummaryBackToReview(study));
    },

    rejectSummary(studyId) {
      changeStudy(studyId, (study) => rejectSummary(study));
    },
  };
}

/** The actions on tags. */
function tagActions(state: StoreState, commit: Commit): TagActions {
  return {
    findOrCreateTag(name) {
      const existing = findTagByName(name, state.catalogue.tags);
      if (existing) return existing;
      const tag = createTag(name);
      commit({ ...state.catalogue, tags: [...state.catalogue.tags, tag] });
      return tag;
    },

    editTag(tagId, changes) {
      return commitTagEdit(commit, editTag(state.catalogue, tagId, changes));
    },

    mergeTags(mergedId, keptId) {
      return commitTagEdit(
        commit,
        mergeTags(state.catalogue, mergedId, keptId),
      );
    },

    deleteTag(tagId) {
      commit(deleteTag(state.catalogue, tagId));
    },
  };
}

/**
 * Commits a successful tag edit, or passes a refusal's message back without changing anything.
 *
 * @returns null when committed; the problem when refused.
 */
function commitTagEdit(commit: Commit, result: TagEditResult): string | null {
  if (result.kind === "refused") return result.problem;
  commit(result.catalogue);
  return null;
}

let appStore: CatalogueStore | undefined;

/**
 * The app's catalogue store. Created on first use, in the browser's localStorage, unless `installCatalogueStore` chose
 * otherwise before the app mounted; shared by every component after.
 */
export function useCatalogue(): CatalogueStore {
  appStore ??= createCatalogueStore(localStorage);
  return appStore;
}

/**
 * Chooses the store the whole app uses; called once at startup (startCatalogue.ts), before anything calls
 * `useCatalogue`.
 */
export function installCatalogueStore(store: CatalogueStore): void {
  appStore = store;
}

/** The starting state from storage: a new catalogue on a first visit, the saved one, or an unsaved one with a problem. */
function loadState(storage: CatalogueStorage): StoreState {
  const stored: StoredCatalogue = storage.load();
  const storageLocation = storage.location;
  if (stored.kind === "loaded") {
    const { catalogue } = stored;
    return { catalogue, loadProblem: null, saveProblem: null, storageLocation };
  }
  const loadProblem = stored.kind === "unreadable" ? stored.problem : null;
  return {
    catalogue: newCatalogue(),
    loadProblem,
    saveProblem: null,
    storageLocation,
  };
}
