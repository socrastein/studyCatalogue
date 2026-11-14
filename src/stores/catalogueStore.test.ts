/**
 * Tests for the catalogue store: changes are saved to storage, unreadable saved data is kept rather than overwritten,
 * a failed save is reported, and the same store works on the home server.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newCatalogue } from "../catalogue/catalogue";
import { parseCatalogue } from "../catalogue/serialization";
import { createDraftSummary, withSummary } from "../catalogue/summary";
import { exampleStudyDetails } from "../catalogue/testFixtures";
import {
  createCatalogueStore,
  createCatalogueStoreOn,
  STORAGE_KEY,
} from "./catalogueStore";
import { createFakeHomeServer } from "./fakeHomeServer";
import {
  createHomeServerStorage,
  DEFAULT_TIMING,
  MERGED_NOTICE,
  REFRESHED_NOTICE,
} from "./homeServerStorage";
import { latestToastRequest, noticeMessage } from "./notice";

/** The catalogue as saved in storage right now; fails the test if nothing readable is saved. */
function savedCatalogue() {
  const result = parseCatalogue(localStorage.getItem(STORAGE_KEY) ?? "");
  if (result.kind !== "parsed")
    throw new Error(`nothing readable saved: ${result.problem}`);
  return result.catalogue;
}

/** A Storage that starts empty and whose writes always fail, as when the quota is full. */
function storageThatRejectsWrites(): Storage {
  return {
    length: 0,
    clear: () => {},
    key: () => null,
    getItem: () => null,
    removeItem: () => {},
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("a store on a first visit", () => {
  it("starts with no studies and the seed tags", () => {
    const store = createCatalogueStore(localStorage);
    expect(store.state.catalogue.studies).toEqual([]);
    expect(store.state.catalogue.tags).toEqual(newCatalogue().tags);
  });
});

describe("studies", () => {
  it("are saved when added, and loaded by the next store", () => {
    const study = createCatalogueStore(localStorage).addStudy(
      exampleStudyDetails(),
    );
    const nextVisit = createCatalogueStore(localStorage);
    expect(nextVisit.state.catalogue.studies).toEqual([study]);
  });

  it("are replaced in place when edited", () => {
    const store = createCatalogueStore(localStorage);
    const study = store.addStudy(exampleStudyDetails());
    store.editStudy(study.id, exampleStudyDetails({ year: 2018 }));
    expect(savedCatalogue().studies.map((saved) => saved.year)).toEqual([2018]);
  });

  it("report undefined when editing a study that does not exist", () => {
    const store = createCatalogueStore(localStorage);
    expect(store.editStudy("missing", exampleStudyDetails())).toBeUndefined();
  });

  it("are removed when deleted", () => {
    const store = createCatalogueStore(localStorage);
    const study = store.addStudy(exampleStudyDetails());
    store.deleteStudy(study.id);
    expect(savedCatalogue().studies).toEqual([]);
  });
});

describe("findOrCreateTag", () => {
  it("reuses an existing tag whatever the case", () => {
    const store = createCatalogueStore(localStorage);
    expect(store.findOrCreateTag("hypertrophy").id).toBe(
      "exercise-science/hypertrophy",
    );
  });

  it("creates and saves a top-level tag for a new name", () => {
    const store = createCatalogueStore(localStorage);
    const tag = store.findOrCreateTag("Sleep");
    expect(tag.parentIds).toEqual([]);
    expect(savedCatalogue().tags).toContainEqual(tag);
  });
});

describe("unreadable saved data", () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY, "{corrupted");
  });

  it("is reported with its raw text", () => {
    const store = createCatalogueStore(localStorage);
    expect(store.state.loadProblem).toEqual({
      message: "The data is not valid JSON.",
      rawText: "{corrupted",
    });
  });

  it("is never overwritten by changes", () => {
    createCatalogueStore(localStorage).addStudy(exampleStudyDetails());
    expect(localStorage.getItem(STORAGE_KEY)).toBe("{corrupted");
  });

  it("is overwritten once the person replaces the catalogue", () => {
    const store = createCatalogueStore(localStorage);
    store.replaceCatalogue(newCatalogue());
    expect(store.state.loadProblem).toBeNull();
    expect(savedCatalogue().studies).toEqual([]);
  });
});

describe("a failed save", () => {
  it("keeps the change in memory and reports that it is not saved", () => {
    const store = createCatalogueStore(storageThatRejectsWrites());
    store.addStudy(exampleStudyDetails());
    expect(store.state.catalogue.studies).toHaveLength(1);
    expect(store.state.saveProblem).toContain("could not be saved");
  });
});

describe("tag edits", () => {
  it("are saved when they succeed", () => {
    const store = createCatalogueStore(localStorage);
    const problem = store.editTag("nutrition", {
      name: "Diet",
      aliases: [],
      parentIds: [],
    });
    expect(problem).toBeNull();
    expect(
      savedCatalogue().tags.find((tag) => tag.id === "nutrition")?.name,
    ).toBe("Diet");
  });

  it("return the problem and change nothing when refused", () => {
    const store = createCatalogueStore(localStorage);
    const problem = store.editTag("nutrition", {
      name: "Physics",
      aliases: [],
      parentIds: [],
    });
    expect(problem).toBe('Another tag is already called "Physics".');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("merge and delete through the store", () => {
    const store = createCatalogueStore(localStorage);
    store.mergeTags(
      "exercise-science/cardio",
      "exercise-science/general-health",
    );
    store.deleteTag("physics");
    const ids = savedCatalogue().tags.map((tag) => tag.id);
    expect(ids).not.toContain("exercise-science/cardio");
    expect(ids).not.toContain("physics");
  });
});

describe("summaries", () => {
  /** A store holding one study with a draft summary, and that study's id. */
  function storeWithDraft() {
    const store = createCatalogueStore(localStorage);
    const study = store.addStudy(exampleStudyDetails());
    const drafted = withSummary(
      study,
      createDraftSummary("A draft.", "abstract"),
    );
    store.replaceCatalogue({
      ...store.state.catalogue,
      studies: [drafted],
    });
    return { store, id: study.id };
  }

  it("are approved and saved, and the approval is there for the next visit", () => {
    const { store, id } = storeWithDraft();
    store.approveSummary(id);
    const saved = savedCatalogue().studies[0];
    expect(saved?.summary?.approvedAt).not.toBeNull();
  });

  it("keep their approval when the words are edited, and are saved", () => {
    const { store, id } = storeWithDraft();
    store.approveSummary(id);
    store.editSummary(id, "His own words.");
    expect(savedCatalogue().studies[0]?.summary).toMatchObject({
      text: "His own words.",
      approvedAt: expect.any(String),
    });
  });

  it("go back to the review queue with their words when sent back, and are saved", () => {
    const { store, id } = storeWithDraft();
    store.approveSummary(id);
    store.sendSummaryBackToReview(id);
    expect(savedCatalogue().studies[0]?.summary).toMatchObject({
      text: "A draft.",
      approvedAt: null,
    });
  });

  it("are deleted when rejected, leaving the study and its abstract", () => {
    const { store, id } = storeWithDraft();
    store.rejectSummary(id);
    const saved = savedCatalogue().studies[0];
    expect(saved).not.toHaveProperty("summary");
    expect(saved?.abstract).toBe(exampleStudyDetails().abstract);
  });

  it("survive an edit of the study's details in the form", () => {
    const { store, id } = storeWithDraft();
    store.editStudy(id, exampleStudyDetails({ year: 2018 }));
    expect(savedCatalogue().studies[0]?.summary?.text).toBe("A draft.");
  });

  it("are left alone by an action on a study that does not exist", () => {
    const { store } = storeWithDraft();
    store.approveSummary("no-such-id");
    expect(savedCatalogue().studies[0]?.summary?.approvedAt).toBeNull();
  });
});

describe("a store on the home server", () => {
  /** A store on a fake server holding one study, with time faked so saves happen when the test says. */
  function homeServerStore(server = createFakeHomeServer()) {
    const storage = createHomeServerStorage(server.copy, server.fetch);
    return { server, store: createCatalogueStoreOn(storage) };
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("says where the catalogue is kept", () => {
    expect(homeServerStore().store.state.storageLocation).toBe("homeServer");
    expect(createCatalogueStore(localStorage).state.storageLocation).toBe(
      "browser",
    );
  });

  it("saves an added study to the server and leaves localStorage alone", async () => {
    const { server, store } = homeServerStore();
    store.addStudy(exampleStudyDetails());
    await vi.advanceTimersByTimeAsync(
      DEFAULT_TIMING.pauseBeforeSavingMilliseconds,
    );
    expect(server.copy.catalogue.studies).toHaveLength(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("shows the merged result and says so when another device saved first", async () => {
    const { server, store } = homeServerStore();
    const other = createCatalogueStoreOn(
      createHomeServerStorage(server.copy, server.fetch),
    );
    other.addStudy(
      exampleStudyDetails({ title: "From the laptop", doi: null }),
    );
    await vi.advanceTimersByTimeAsync(
      DEFAULT_TIMING.pauseBeforeSavingMilliseconds,
    );

    store.addStudy(exampleStudyDetails({ title: "From the PC", doi: null }));
    await vi.advanceTimersByTimeAsync(
      DEFAULT_TIMING.pauseBeforeSavingMilliseconds,
    );

    const titles = store.state.catalogue.studies.map((study) => study.title);
    expect(titles.sort()).toEqual(["From the PC", "From the laptop"]);
    expect(latestToastRequest.value.text).toBe(MERGED_NOTICE);
    // The page's own banner is left for the page's own confirmations
    expect(noticeMessage.value).toBe("");
  });

  it("keeps a change made while the server is away and shows the save problem", async () => {
    const server = createFakeHomeServer();
    server.isOffline = true;
    const { store } = homeServerStore(server);
    store.addStudy(exampleStudyDetails());
    await vi.advanceTimersByTimeAsync(
      DEFAULT_TIMING.pauseBeforeSavingMilliseconds,
    );
    expect(store.state.catalogue.studies).toHaveLength(1);
    expect(store.state.saveProblem).toContain("home server");
  });

  it("refreshes to the server's newer copy", async () => {
    const { server, store } = homeServerStore();
    server.saveFromAnotherDevice({
      ...newCatalogue(),
      studies: [],
      tags: newCatalogue().tags.slice(0, 2),
    });
    await store.refresh();
    expect(store.state.catalogue.tags).toHaveLength(2);
    expect(latestToastRequest.value.text).toBe(REFRESHED_NOTICE);
    expect(noticeMessage.value).toBe("");
  });

  it("confirms in the toast that the changes are saved once a failed save succeeds", async () => {
    const server = createFakeHomeServer();
    server.isOffline = true;
    const { store } = homeServerStore(server);
    store.addStudy(exampleStudyDetails());
    await vi.advanceTimersByTimeAsync(
      DEFAULT_TIMING.pauseBeforeSavingMilliseconds,
    );
    expect(store.state.saveProblem).not.toBeNull();
    const requestsBefore = latestToastRequest.value.number;

    server.isOffline = false;
    await vi.advanceTimersByTimeAsync(
      DEFAULT_TIMING.retryAfterFailureMilliseconds,
    );

    expect(store.state.saveProblem).toBeNull();
    expect(latestToastRequest.value.number).toBe(requestsBefore + 1);
    expect(latestToastRequest.value.text).toBe(
      "Your changes are now saved on the home server.",
    );
  });

  it("says nothing extra when an ordinary save succeeds", async () => {
    const { store } = homeServerStore();
    const requestsBefore = latestToastRequest.value.number;
    store.addStudy(exampleStudyDetails());
    await vi.advanceTimersByTimeAsync(
      DEFAULT_TIMING.pauseBeforeSavingMilliseconds,
    );
    expect(latestToastRequest.value.number).toBe(requestsBefore);
  });
});

describe("a store on the browser's storage after a failed save", () => {
  it("says the changes are saved in this browser once the storage accepts them again", () => {
    let isFull = true;
    const storage = storageThatRejectsWrites();
    storage.setItem = (key, value) => {
      if (isFull) throw new Error("QuotaExceededError");
      localStorage.setItem(key, value);
    };
    const store = createCatalogueStore(storage);
    store.addStudy(exampleStudyDetails({ title: "One", doi: null }));
    expect(store.state.saveProblem).not.toBeNull();

    isFull = false;
    store.addStudy(exampleStudyDetails({ title: "Two", doi: null }));

    expect(store.state.saveProblem).toBeNull();
    expect(latestToastRequest.value.text).toBe(
      "Your changes are now saved in this browser.",
    );
  });
});
