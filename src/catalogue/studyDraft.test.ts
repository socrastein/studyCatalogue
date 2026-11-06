/**
 * Tests for the form draft: converting saved studies to drafts and back, and every validation message.
 */
import { describe, expect, it } from "vitest";
import {
  draftFromDetails,
  emptyDraft,
  validateDraft,
  type DraftErrors,
  type StudyDraft,
} from "./studyDraft";
import { exampleStudyDetails } from "./testFixtures";

const CURRENT_YEAR = 2026;

/** The draft of the example study, with any fields replaced. */
function exampleDraft(overrides: Partial<StudyDraft> = {}): StudyDraft {
  return { ...draftFromDetails(exampleStudyDetails()), ...overrides };
}

/** The validation messages for a draft; fails the test if the draft is valid. */
function errorsFor(draft: StudyDraft): DraftErrors {
  const result = validateDraft(draft, CURRENT_YEAR);
  if (result.kind === "valid")
    throw new Error("expected the draft to be invalid");
  return result.errors;
}

/** The details a valid draft becomes; fails the test if the draft is invalid. */
function detailsFor(draft: StudyDraft) {
  const result = validateDraft(draft, CURRENT_YEAR);
  if (result.kind === "invalid")
    throw new Error(`unexpected errors: ${JSON.stringify(result.errors)}`);
  return result.details;
}

describe("emptyDraft", () => {
  it("has one blank author row and subjects preset to humans", () => {
    const draft = emptyDraft();
    expect(draft.authors).toEqual([{ family: "", given: "" }]);
    expect(draft.subjects).toBe("humans");
    expect(draft.design).toBe("");
  });
});

describe("draftFromDetails and validateDraft", () => {
  it("round-trip a saved study's details unchanged", () => {
    expect(detailsFor(exampleDraft())).toEqual(exampleStudyDetails());
  });

  it("give missing optional fields as empty text in the draft", () => {
    const draft = draftFromDetails(
      exampleStudyDetails({ volume: null, doi: null }),
    );
    expect(draft.volume).toBe("");
    expect(draft.doi).toBe("");
  });

  it("copy the lists, so editing the draft never changes the saved study", () => {
    const details = exampleStudyDetails();
    draftFromDetails(details).tagIds.push("other");
    expect(details.tagIds).toEqual(["exercise-science/hypertrophy"]);
  });
});

describe("validateDraft turns a valid draft into details", () => {
  it("trimming text and storing blank optional fields as null", () => {
    const details = detailsFor(
      exampleDraft({ title: "  A title  ", volume: " ", url: "" }),
    );
    expect(details.title).toBe("A title");
    expect(details.volume).toBeNull();
    expect(details.url).toBeNull();
  });

  it("reducing a pasted doi.org link to the bare DOI", () => {
    const details = detailsFor(
      exampleDraft({ doi: "https://doi.org/10.1000/abc" }),
    );
    expect(details.doi).toBe("10.1000/abc");
  });

  it("dropping blank author rows", () => {
    const authors = [
      { family: "", given: "" },
      { family: " Smith ", given: " Jane " },
      { family: "", given: "" },
    ];
    expect(detailsFor(exampleDraft({ authors })).authors).toEqual([
      { family: "Smith", given: "Jane" },
    ]);
  });

  it("accepting next year, for papers published ahead of print", () => {
    expect(detailsFor(exampleDraft({ year: "2027" })).year).toBe(2027);
  });
});

describe("validateDraft rejects", () => {
  it("a blank title and journal", () => {
    const errors = errorsFor(exampleDraft({ title: " ", journal: "" }));
    expect(errors.title).toBe("Enter the study's title.");
    expect(errors.journal).toBe("Enter the journal it was published in.");
  });

  it("a draft with no authors, on the first row", () => {
    const errors = errorsFor(
      exampleDraft({ authors: [{ family: "", given: "" }] }),
    );
    expect(errors["authors.0.family"]).toBe(
      "Enter at least one author's family name.",
    );
  });

  it("an author row with a given name but no family name, on that row", () => {
    const authors = [
      { family: "Smith", given: "Jane" },
      { family: "", given: "Ann" },
    ];
    expect(errorsFor(exampleDraft({ authors }))["authors.1.family"]).toBe(
      "Enter this author's family name.",
    );
  });

  it.each([
    ["", "Enter the year it was published."],
    ["20x7", "Enter the year as a number, between 1665 and 2027."],
    ["1600", "Enter a year between 1665 and 2027."],
    ["2028", "Enter a year between 1665 and 2027."],
  ])("the year %j", (year, message) => {
    expect(errorsFor(exampleDraft({ year })).year).toBe(message);
  });

  it("a DOI that is not shaped like one", () => {
    expect(errorsFor(exampleDraft({ doi: "JSC.000123" })).doi).toContain(
      "Enter a DOI starting with 10.",
    );
  });

  it("a URL that is not a web address", () => {
    expect(errorsFor(exampleDraft({ url: "example.org/paper" })).url).toBe(
      "Enter a full web address starting with https:// or http://.",
    );
  });

  it("a missing design or subjects", () => {
    const errors = errorsFor(exampleDraft({ design: "", subjects: "" }));
    expect(errors.design).toBe("Choose the study design.");
    expect(errors.subjects).toBe("Choose what was studied.");
  });
});

describe("validateDraft allows", () => {
  it("leaving every population facet empty, meaning not reported", () => {
    const draft = exampleDraft({
      ageGroups: [],
      trainingStatuses: [],
      sexes: [],
    });
    expect(validateDraft(draft, CURRENT_YEAR).kind).toBe("valid");
  });

  it("leaving the DOI, URL, volume, issue, pages and abstract empty", () => {
    const draft = exampleDraft({
      doi: "",
      url: "",
      volume: "",
      issue: "",
      pages: "",
      abstract: "",
    });
    expect(validateDraft(draft, CURRENT_YEAR).kind).toBe("valid");
  });
});
