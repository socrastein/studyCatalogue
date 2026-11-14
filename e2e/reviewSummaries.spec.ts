/**
 * Browser tests for reviewing draft summaries: the page shows one study at a time with its draft beside the abstract and
 * citation, Approve, Edit and Reject do what they say and save it, the count and the nav link follow the queue (the link
 * exists only while drafts wait), and every state passes axe.
 */
import { expect, test, type Page } from "@playwright/test";
import { parseCatalogue } from "../src/catalogue/serialization";
import { createDraftSummary } from "../src/catalogue/summary";
import { STORAGE_KEY } from "../src/stores/catalogueStore";
import { expectNoAxeViolations } from "./expectNoAxeViolations";
import { openWithSummaries, studyDetails } from "./seedCatalogue";

const WHEN = new Date("2026-11-10T10:00:00.000Z");

/** Two studies with drafts and one with none, in that order; DOIs differ so the studies stay apart. */
async function openWithTwoDrafts(page: Page): Promise<void> {
  await openWithSummaries(page, [
    {
      details: studyDetails({
        title: "First drafted study",
        abstract: "The first abstract.",
        doi: "10.1000/first",
      }),
      summary: createDraftSummary("The first draft.", "abstract", WHEN),
    },
    {
      details: studyDetails({
        title: "Second drafted study",
        abstract: "The second abstract.",
        doi: "10.1000/second",
      }),
      summary: createDraftSummary("The second draft.", "fullText", WHEN),
    },
    {
      details: studyDetails({
        title: "Study with no draft",
        doi: "10.1000/none",
      }),
    },
  ]);
}

/** What is saved in the browser right now, as studies by title. */
async function savedStudies(page: Page) {
  const text = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );
  const result = parseCatalogue(text ?? "");
  if (result.kind !== "parsed") throw new Error("nothing readable saved");
  return new Map(result.catalogue.studies.map((study) => [study.title, study]));
}

test("the page shows the draft beside the abstract and the citation, with where it came from and how many remain", async ({
  page,
}) => {
  await openWithTwoDrafts(page);
  await page.goto("/review");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Review Summaries",
  );
  await expect(
    page.getByText("2 summaries left to review", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "First drafted study" }),
  ).toBeVisible();
  await expect(page.getByText("The first draft.")).toBeVisible();
  await expect(page.getByText("The first abstract.")).toBeVisible();
  await expect(page.getByText("Written from the abstract.")).toBeVisible();
  // The citation (APA): authors, year, title
  await expect(
    page.getByText(/Schoenfeld, B\. J\., .* \(2017\)\./),
  ).toBeVisible();
  // The second study waits its turn
  await expect(page.getByText("The second draft.")).toHaveCount(0);
});

test("a full-text draft names the PDF it was written from, an abstract draft does not", async ({
  page,
}) => {
  await openWithSummaries(page, [
    {
      details: studyDetails({ title: "From a PDF", doi: "10.1000/pdf" }),
      summary: {
        ...createDraftSummary("Pdf draft.", "fullText", WHEN),
        sourceFile: "(Hall, 2018) Carbohydrate Insulin Model.pdf",
      },
    },
    {
      details: studyDetails({ title: "From an abstract", doi: "10.1000/abs" }),
      summary: createDraftSummary("Abstract draft.", "abstract", WHEN),
    },
  ]);
  await page.goto("/review");
  await expect(
    page.getByText(
      "Written from the full text. File: (Hall, 2018) Carbohydrate Insulin Model.pdf",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText("Written from the abstract.")).toBeVisible();
  await expect(page.getByText(/File:/)).toHaveCount(0);
});

test("Skip puts the draft at the end of the queue for this visit and saves nothing", async ({
  page,
}) => {
  await openWithTwoDrafts(page);
  await page.goto("/review");
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );

  await page.getByRole("button", { name: "Skip" }).click();
  await expect(
    page.getByRole("heading", { name: "Second drafted study" }),
  ).toBeFocused();
  await expect(page.getByRole("status").first()).toContainText(
    'Skipped "First drafted study".',
  );
  await expect(
    page.getByText("2 summaries left to review", { exact: true }),
  ).toBeVisible();

  // Skipping the second brings the first back round
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(
    page.getByRole("heading", { name: "First drafted study" }),
  ).toBeVisible();

  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe(before);
  // The next visit starts from the catalogue's order again
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "First drafted study" }),
  ).toBeVisible();
});

test("there is no Skip while only one draft waits", async ({ page }) => {
  await openWithSummaries(page, [
    {
      details: studyDetails({ title: "Only one" }),
      summary: createDraftSummary("Only draft.", "abstract", WHEN),
    },
  ]);
  await page.goto("/review");
  await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip" })).toHaveCount(0);
});

test("the nav link counts the drafts, and is there only while drafts wait", async ({
  page,
}) => {
  await openWithTwoDrafts(page);
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main" });
  await expect(
    navigation.getByRole("link", { name: "Review Summaries (2)" }),
  ).toBeVisible();

  // Nothing to review: no link
  await openWithSummaries(page, [{ details: studyDetails({}) }]);
  await expect(
    navigation.getByRole("link", { name: /Review Summaries/ }),
  ).toHaveCount(0);
});

test("on a phone the link is in the menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWithTwoDrafts(page);
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("link", { name: "Review Summaries (2)" }).click();
  await expect(page).toHaveURL("/review");
});

test("Approve saves the approval and moves on to the next draft, announcing it", async ({
  page,
}) => {
  await openWithTwoDrafts(page);
  await page.goto("/review");
  await page.getByRole("button", { name: "Approve" }).click();

  await expect(
    page.getByText("1 summary left to review", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText(
    'Approved the summary of "First drafted study".',
  );
  await expect(
    page.getByRole("heading", { name: "Second drafted study" }),
  ).toBeFocused();
  const studies = await savedStudies(page);
  expect(
    studies.get("First drafted study")?.summary?.approvedAt,
  ).not.toBeNull();
  expect(studies.get("Second drafted study")?.summary?.approvedAt).toBeNull();
});

test("approving the last draft says none are left, and the link goes", async ({
  page,
}) => {
  await openWithSummaries(page, [
    {
      details: studyDetails({ title: "Only one" }),
      summary: createDraftSummary("Only draft.", "abstract", WHEN),
    },
  ]);
  await page.goto("/review");
  await page.getByRole("button", { name: "Approve" }).click();

  await expect(
    page.getByText("No summaries are waiting for review."),
  ).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText("None left.");
  await expect(
    page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: /Review Summaries/ }),
  ).toHaveCount(0);
});

test("Edit changes the words, keeps the draft up for approval, and an empty summary is refused", async ({
  page,
}) => {
  await openWithTwoDrafts(page);
  await page.goto("/review");
  await page.getByRole("button", { name: "Edit" }).click();

  const box = page.getByRole("textbox", { name: "Summary" });
  await expect(box).toBeFocused();
  await expect(box).toHaveValue("The first draft.");
  await box.fill("   ");
  await page.getByRole("button", { name: "Save Edit" }).click();
  await expect(
    page.getByText("Write a summary, or reject the draft instead."),
  ).toBeVisible();

  await box.fill("Matt's own words.");
  await page.getByRole("button", { name: "Save Edit" }).click();
  await expect(page.getByText("Matt's own words.")).toBeVisible();
  // Still the first study, still waiting for approval
  await expect(
    page.getByText("2 summaries left to review", { exact: true }),
  ).toBeVisible();
  const studies = await savedStudies(page);
  expect(studies.get("First drafted study")?.summary).toMatchObject({
    text: "Matt's own words.",
    approvedAt: null,
  });
});

test("Cancel leaves the editor without changing the words, and returns to the Edit button", async ({
  page,
}) => {
  await openWithTwoDrafts(page);
  await page.goto("/review");
  await page.getByRole("button", { name: "Edit" }).click();
  await page
    .getByRole("textbox", { name: "Summary" })
    .fill("Typed, then dropped");
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByText("The first draft.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit" })).toBeFocused();
});

test("Reject asks first, then deletes the draft and nothing else", async ({
  page,
}) => {
  await openWithTwoDrafts(page);
  await page.goto("/review");
  await page.getByRole("button", { name: "Reject" }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Reject this draft?");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(
    (await savedStudies(page)).get("First drafted study")?.summary,
  ).toBeDefined();

  await page.getByRole("button", { name: "Reject" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Reject Draft" })
    .click();

  await expect(
    page.getByText("1 summary left to review", { exact: true }),
  ).toBeVisible();
  const first = (await savedStudies(page)).get("First drafted study");
  expect(first).toBeDefined();
  expect(first).not.toHaveProperty("summary");
  expect(first?.abstract).toBe("The first abstract.");
});

test("a study with no abstract says so beside its draft", async ({ page }) => {
  await openWithSummaries(page, [
    {
      details: studyDetails({ title: "Abstractless", abstract: "" }),
      summary: createDraftSummary("A draft.", "fullText", WHEN),
    },
  ]);
  await page.goto("/review");
  await expect(page.getByText("This study has no abstract.")).toBeVisible();
  await expect(page.getByText("Written from the full text.")).toBeVisible();
});

test.describe("accessibility", () => {
  test("the page with a draft has no violations", async ({ page }) => {
    await openWithTwoDrafts(page);
    await page.goto("/review");
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("the editor open, with its error showing, has no violations", async ({
    page,
  }) => {
    await openWithTwoDrafts(page);
    await page.goto("/review");
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("textbox", { name: "Summary" }).fill("");
    await page.getByRole("button", { name: "Save Edit" }).click();
    await expect(page.getByText("Write a summary, or reject")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("the reject question has no violations", async ({ page }) => {
    await openWithTwoDrafts(page);
    await page.goto("/review");
    await page.getByRole("button", { name: "Reject" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("the empty page has no violations", async ({ page }) => {
    await openWithSummaries(page, [{ details: studyDetails({}) }]);
    await page.goto("/review");
    await expect(
      page.getByText("No summaries are waiting for review."),
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("on a phone, the page has no violations", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWithTwoDrafts(page);
    await page.goto("/review");
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
