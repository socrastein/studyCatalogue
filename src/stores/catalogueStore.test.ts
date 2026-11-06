/**
 * Tests for the catalogue store: changes are saved to storage, unreadable saved data is kept rather than overwritten,
 * and a failed save is reported.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { newCatalogue } from "../catalogue/catalogue";
import { parseCatalogue } from "../catalogue/serialization";
import { exampleStudyDetails } from "../catalogue/testFixtures";
import { createCatalogueStore, STORAGE_KEY } from "./catalogueStore";

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
