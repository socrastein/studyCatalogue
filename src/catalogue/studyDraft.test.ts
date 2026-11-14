/**
 * Tests for the form draft: converting saved studies to drafts and back, and every validation message.
 */
import { describe, expect, it } from "vitest";
import { reactive } from "vue";
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
  it("is blank, with subjects preset to humans", () => {
    const draft = emptyDraft();
    expect(draft.authors).toBe("");
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

describe("draftFromDetails given a whole saved study", () => {
  it("holds only form fields, so a summary or id never reaches the draft", () => {
    const study = {
      ...exampleStudyDetails(),
      id: "abc",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      summary: {
        text: "A made-up summary.",
        source: "abstract",
        generatedAt: "2026-01-01T00:00:00.000Z",
        approvedAt: null,
      },
    };
    const draft = draftFromDetails(study);
    expect(Object.keys(draft).sort()).toEqual(Object.keys(emptyDraft()).sort());
  });

  it("makes a draft the form can clone even when the study is a reactive proxy", () => {
    // The edit page reads the study from reactive store state, where its summary is a nested proxy
    const study = reactive({
      ...exampleStudyDetails(),
      summary: { text: "Made up.", approvedAt: null },
    });
    expect(() => structuredClone(draftFromDetails(study))).not.toThrow();
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

  it("reading a pasted author list into names", () => {
    const draft = exampleDraft({ authors: "Smith J, Lee AB." });
    expect(detailsFor(draft).authors).toEqual([
      { kind: "person", family: "Smith", given: "J" },
      { kind: "person", family: "Lee", given: "AB" },
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

  it("a draft with no authors", () => {
    const errors = errorsFor(exampleDraft({ authors: "  " }));
    expect(errors.authors).toBe("Enter the authors.");
  });

  it('an author list cut short with "et al.", since a reference lists every author', () => {
    const errors = errorsFor(exampleDraft({ authors: "Johnson et al." }));
    expect(errors.authors).toContain('Enter every author instead of "et al."');
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
