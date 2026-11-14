/**
 * Tests for a study's summary: the drafts waiting for review, and the four changes (put one on, approve, edit, reject),
 * each of which must stamp `updatedAt` so the backup merge sees the edit.
 */
import { describe, expect, it } from "vitest";
import { createStudy } from "./study";
import {
  approvalDateText,
  approveSummary,
  createDraftSummary,
  editSummaryText,
  isAwaitingReview,
  describeSummarySource,
  rejectSummary,
  sendSummaryBackToReview,
  studiesAwaitingReview,
  studiesInReviewOrder,
  summaryStatusText,
  withSummary,
} from "./summary";
import { exampleStudyDetails } from "./testFixtures";

const CREATED = new Date("2026-11-01T10:00:00.000Z");
const DRAFTED = new Date("2026-11-02T10:00:00.000Z");
const LATER = new Date("2026-11-03T10:00:00.000Z");

/** A study with a draft summary. */
function studyWithDraft() {
  const study = createStudy(exampleStudyDetails(), CREATED);
  const draft = createDraftSummary("The draft.", "abstract", DRAFTED);
  return withSummary(study, draft, DRAFTED);
}

describe("createDraftSummary", () => {
  it("makes an unapproved draft, stamped with when it was written", () => {
    expect(createDraftSummary("Words.", "fullText", DRAFTED)).toEqual({
      text: "Words.",
      source: "fullText",
      generatedAt: "2026-11-02T10:00:00.000Z",
      approvedAt: null,
    });
  });
});

describe("withSummary", () => {
  it("puts the summary on the study and stamps the edit", () => {
    const study = studyWithDraft();
    expect(study.summary?.text).toBe("The draft.");
    expect(study.updatedAt).toBe("2026-11-02T10:00:00.000Z");
  });

  it("leaves the original study unchanged", () => {
    const original = createStudy(exampleStudyDetails(), CREATED);
    withSummary(original, createDraftSummary("x", "abstract"), DRAFTED);
    expect(original.summary).toBeUndefined();
  });

  it("makes a new draft over an approved summary unapproved: the approval was of the old words", () => {
    const approved = approveSummary(studyWithDraft(), LATER);
    const redrafted = withSummary(
      approved,
      createDraftSummary("New words.", "fullText", LATER),
      LATER,
    );
    expect(redrafted.summary?.approvedAt).toBeNull();
  });
});

describe("isAwaitingReview and studiesAwaitingReview", () => {
  it("count a draft, and neither an approved summary nor a study with none", () => {
    const none = createStudy(exampleStudyDetails(), CREATED);
    const draft = studyWithDraft();
    const approved = approveSummary(studyWithDraft(), LATER);
    expect([none, draft, approved].map(isAwaitingReview)).toEqual([
      false,
      true,
      false,
    ]);
    expect(studiesAwaitingReview([none, draft, approved])).toEqual([draft]);
  });
});

describe("approveSummary", () => {
  it("stamps the approval and the edit", () => {
    const approved = approveSummary(studyWithDraft(), LATER);
    expect(approved.summary?.approvedAt).toBe("2026-11-03T10:00:00.000Z");
    expect(approved.updatedAt).toBe("2026-11-03T10:00:00.000Z");
  });

  it("returns a study with no summary, or an already approved one, unchanged", () => {
    const none = createStudy(exampleStudyDetails(), CREATED);
    expect(approveSummary(none, LATER)).toBe(none);
    const approved = approveSummary(studyWithDraft(), LATER);
    expect(approveSummary(approved, new Date("2026-12-01"))).toBe(approved);
  });
});

describe("editSummaryText", () => {
  it("changes the words and keeps a draft a draft", () => {
    const edited = editSummaryText(studyWithDraft(), "Better words.", LATER);
    expect(edited.summary).toMatchObject({
      text: "Better words.",
      approvedAt: null,
    });
    expect(edited.updatedAt).toBe("2026-11-03T10:00:00.000Z");
  });

  it("keeps an approved summary approved: the words are then Matt's own", () => {
    const approved = approveSummary(studyWithDraft(), DRAFTED);
    const edited = editSummaryText(approved, "His own words.", LATER);
    expect(edited.summary).toMatchObject({
      text: "His own words.",
      approvedAt: "2026-11-02T10:00:00.000Z",
    });
  });

  it("returns a study with no summary unchanged", () => {
    const none = createStudy(exampleStudyDetails(), CREATED);
    expect(editSummaryText(none, "x", LATER)).toBe(none);
  });
});

describe("rejectSummary", () => {
  it("deletes the draft and nothing else, stamping the edit", () => {
    const study = studyWithDraft();
    const rejected = rejectSummary(study, LATER);
    expect(rejected).not.toHaveProperty("summary");
    expect(rejected.abstract).toBe(study.abstract);
    expect(rejected.title).toBe(study.title);
    expect(rejected.updatedAt).toBe("2026-11-03T10:00:00.000Z");
  });
});

describe("sendSummaryBackToReview", () => {
  it("clears the approval, keeps the words, and stamps the edit", () => {
    const approved = approveSummary(studyWithDraft(), LATER);
    const sentBack = sendSummaryBackToReview(approved, LATER);
    expect(sentBack.summary).toMatchObject({
      text: "The draft.",
      approvedAt: null,
    });
    expect(isAwaitingReview(sentBack)).toBe(true);
    expect(sentBack.updatedAt).toBe("2026-11-03T10:00:00.000Z");
  });

  it("returns a draft, or a study with no summary, unchanged", () => {
    const draft = studyWithDraft();
    expect(sendSummaryBackToReview(draft, LATER)).toBe(draft);
    const none = createStudy(exampleStudyDetails(), CREATED);
    expect(sendSummaryBackToReview(none, LATER)).toBe(none);
  });
});

describe("describeSummarySource", () => {
  it("says an abstract summary was written from the abstract", () => {
    const summary = createDraftSummary("Text.", "abstract", DRAFTED);
    expect(describeSummarySource(summary)).toBe("Written from the abstract.");
  });

  it("names the PDF of a full-text summary when it is known", () => {
    const summary = {
      ...createDraftSummary("Text.", "fullText", DRAFTED),
      sourceFile: "Made Up 2018.pdf",
    };
    expect(describeSummarySource(summary)).toBe(
      "Written from the full text. File: Made Up 2018.pdf",
    );
  });

  it("gives no file for a full-text summary without one", () => {
    const summary = createDraftSummary("Text.", "fullText", DRAFTED);
    expect(describeSummarySource(summary)).toBe("Written from the full text.");
  });
});

describe("summaryStatusText and approvalDateText", () => {
  it("call a summary a draft until it is approved", () => {
    const draft = studyWithDraft();
    expect(summaryStatusText(draft.summary!)).toBe("Draft");
    const approved = approveSummary(draft, LATER);
    expect(summaryStatusText(approved.summary!)).toBe("Approved");
  });

  it("write the approval's day in the given time zone", () => {
    expect(approvalDateText("2026-11-03T10:00:00.000Z", "UTC")).toBe(
      "Nov 3, 2026",
    );
  });
});

describe("studiesInReviewOrder", () => {
  /** Three studies with drafts, in catalogue order a, b, c, and one with none. */
  function threeDrafts() {
    const make = (title: string) =>
      withSummary(
        createStudy(exampleStudyDetails({ title }), CREATED),
        createDraftSummary(`${title} draft`, "abstract", DRAFTED),
        DRAFTED,
      );
    return [
      make("a"),
      make("b"),
      createStudy(exampleStudyDetails({ title: "none" }), CREATED),
      make("c"),
    ];
  }
  const titles = (studies: readonly { title: string }[]) =>
    studies.map((study) => study.title);

  it("is the catalogue's order of drafts when nothing was skipped", () => {
    expect(titles(studiesInReviewOrder(threeDrafts(), []))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("puts a skipped draft after the rest", () => {
    const studies = threeDrafts();
    const skippedA = [studies[0]?.id ?? ""];
    expect(titles(studiesInReviewOrder(studies, skippedA))).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("puts the skipped drafts last, the longest ago skipped first", () => {
    const studies = threeDrafts();
    const [a, b, , c] = studies;
    const skipped = [b?.id ?? "", a?.id ?? ""];
    expect(titles(studiesInReviewOrder(studies, skipped))).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(c).toBeDefined();
  });

  it("ignores a skipped id whose draft is gone", () => {
    expect(titles(studiesInReviewOrder(threeDrafts(), ["no-such-id"]))).toEqual(
      ["a", "b", "c"],
    );
  });
});
