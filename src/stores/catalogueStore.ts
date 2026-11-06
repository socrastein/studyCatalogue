/**
 * The catalogue's live state for the whole app, kept in localStorage. Views read `catalogue` reactively and change
 * it only through the store's actions, each of which saves straight away.
 *
 * Two problems are surfaced rather than hidden:
 * - Saved data that cannot be read is never overwritten: the app runs on an empty catalogue without saving, and
 *   `loadProblem` keeps the raw text so the person can download it before choosing to start over.
 * - A save that fails (the storage quota is full, or storage is blocked) leaves the change in memory and sets
 *   `saveProblem`, so the person knows it will be lost on reload.
 */
import { reactive, readonly, type DeepReadonly } from "vue";
import { newCatalogue, type Catalogue } from "../catalogue/catalogue";
import { parseCatalogue, serializeCatalogue } from "../catalogue/serialization";
import {
  createStudy,
  updateStudy,
  type Study,
  type StudyDetails,
} from "../catalogue/study";
import {
  deleteTag,
  editTag,
  mergeTags,
  type TagChanges,
  type TagEditResult,
} from "../catalogue/tagEdits";
import { createTag, findTagByName, type Tag } from "../catalogue/tags";

/** The localStorage key the catalogue is saved under. */
export const STORAGE_KEY = "studyCatalogue";

/** Saved data the app could not read, kept untouched until the person decides what to do with it. */
export type LoadProblem = { message: string; rawText: string };

type StoreState = {
  catalogue: Catalogue;
  loadProblem: LoadProblem | null;
  saveProblem: string | null;
};

/** The store's interface: read the state, change it only through the actions. */
export type CatalogueStore = {
  /** Read-only view of the state; views read it reactively. */
  state: DeepReadonly<StoreState>;
} & StudyActions &
  TagActions & {
    /**
     * Replaces the whole catalogue, as an import does, and saves it. Also clears a load problem: the person has
     * chosen what the catalogue should be, so the unreadable data may now be overwritten.
     */
    replaceCatalogue(catalogue: Catalogue): void;
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
 * A catalogue store saving to the given storage, starting from what that storage holds. The app uses one, made by
 * `useCatalogue`; tests make their own with a fresh storage.
 *
 * @param storage Where the catalogue is saved; localStorage in the app.
 */
export function createCatalogueStore(storage: Storage): CatalogueStore {
  const state = reactive<StoreState>(loadState(storage));

  /** Saves the current catalogue, unless unreadable saved data must be kept; records whether the save failed. */
  function save(): void {
    if (state.loadProblem) return;
    state.saveProblem = writeCatalogue(storage, state.catalogue);
  }

  /** Makes the given catalogue the current one and saves it: the one way every action changes the catalogue. */
  function commit(catalogue: Catalogue): void {
    state.catalogue = catalogue;
    save();
  }

  return {
    state: readonly(state),
    ...studyActions(state, commit),
    ...tagActions(state, commit),
    replaceCatalogue(catalogue) {
      // Cleared first, so the commit's save may overwrite the unreadable data the person has chosen to replace
      state.loadProblem = null;
      commit(catalogue);
    },
  };
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
 * The app's catalogue store, saving to localStorage. Created on first use and shared by every component after.
 */
export function useCatalogue(): CatalogueStore {
  appStore ??= createCatalogueStore(localStorage);
  return appStore;
}

/**
 * The starting state from storage: a new catalogue on a first visit, the saved one when it reads cleanly, and a new
 * unsaved one with the problem recorded when it does not.
 */
function loadState(storage: Storage): StoreState {
  const rawText = storage.getItem(STORAGE_KEY);
  if (rawText === null) {
    return { catalogue: newCatalogue(), loadProblem: null, saveProblem: null };
  }
  const result = parseCatalogue(rawText);
  if (result.kind === "parsed") {
    return {
      catalogue: result.catalogue,
      loadProblem: null,
      saveProblem: null,
    };
  }
  const loadProblem = { message: result.problem, rawText };
  return { catalogue: newCatalogue(), loadProblem, saveProblem: null };
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
