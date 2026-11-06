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
  TagActions &
  CatalogueActions;

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
};

type CatalogueActions = {
  /**
   * Replaces the whole catalogue, as an import does, and saves it. Also clears a load problem: the person has chosen
   * what the catalogue should be, so the unreadable data may now be overwritten.
   */
  replaceCatalogue(catalogue: Catalogue): void;
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

  return {
    state: readonly(state),
    ...studyActions(state, save),
    ...tagActions(state, save),
    ...catalogueActions(state, save),
  };
}

/** The actions that add, edit and delete studies, each saving afterwards. */
function studyActions(state: StoreState, save: () => void): StudyActions {
  return {
    addStudy(details) {
      const study = createStudy(details);
      state.catalogue.studies.push(study);
      save();
      return study;
    },

    editStudy(id, details) {
      const studies = state.catalogue.studies;
      const index = studies.findIndex((study) => study.id === id);
      const existing = studies[index];
      if (existing === undefined) return undefined;
      const updated = updateStudy(existing, details);
      studies[index] = updated;
      save();
      return updated;
    },

    deleteStudy(id) {
      const remaining = state.catalogue.studies.filter(
        (study) => study.id !== id,
      );
      state.catalogue.studies = remaining;
      save();
    },
  };
}

/** The actions on tags, each saving afterwards. */
function tagActions(state: StoreState, save: () => void): TagActions {
  return {
    findOrCreateTag(name) {
      const existing = findTagByName(name, state.catalogue.tags);
      if (existing) return existing;
      const tag = createTag(name);
      state.catalogue.tags.push(tag);
      save();
      return tag;
    },
  };
}

/** The actions on the catalogue as a whole. */
function catalogueActions(
  state: StoreState,
  save: () => void,
): CatalogueActions {
  return {
    replaceCatalogue(catalogue) {
      state.catalogue = catalogue;
      state.loadProblem = null;
      save();
    },
  };
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
