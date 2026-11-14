/**
 * Browser tests for seeing and correcting a study's summary after it was approved: the study list shows it with its
 * status, the Edit Study page edits it (save, send back to review, remove) separately from the study's own fields,
 * and a study with no summary offers nothing to edit. Every state passes axe.
 */
import { expect, test, type Page } from "@playwright/test";
import { createDraftSummary } from "../src/catalogue/summary";
import { expectNoAxeViolations } from "./expectNoAxeViolations";
import { openWithSummaries, studyDetails } from "./seedCatalogue";
import { textField } from "./studyFormSteps";

const WHEN = new Date("2026-11-10T10:00:00.000Z");

/** An approved summary, as the review screen leaves it. */
const approvedSummary = {
  ...createDraftSummary("The approved words.", "fullText", WHEN),
  approvedAt: "2026-11-11T10:00:00.000Z",
  sourceFile: "Made Up 2019.pdf",
};

/** One study with an approved summary, one with a draft, one with none; DOIs differ so the studies stay apart. */
async function openWithThreeStudies(page: Page): Promise<void> {
  await openWithSummaries(page, [
    {
      details: studyDetails({
        title: "Study with approved summary",
        doi: "10.1000/approved",
      }),
      summary: approvedSummary,
    },
    {
      details: studyDetails({
        title: "Study with draft summary",
        doi: "10.1000/draft",
        abstract: "The draft study's abstract.",
      }),
      summary: createDraftSummary("The draft words.", "abstract", WHEN),
    },
    {
      details: studyDetails({
        title: "Study with no summary",
        doi: "10.1000/none",
      }),
    },
  ]);
}

/** Opens a study's edit page from the study list by its title. */
async function openEditPage(page: Page, title: string): Promise<void> {
  await page.getByRole("link", { name: title }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit Study" }),
  ).toBeVisible();
}

/** The summary section of the edit page (found by id: see the note in expectNoAxeViolations.ts on role names and Firefox). */
function summarySection(page: Page) {
  return page.locator("#study-summary");
}

/** The confirmation toast, found as the live region (role status) that is showing a message, so a screen reader hears it. */
function summaryToast(page: Page) {
  return page.getByRole("status").filter({ has: page.locator(".toast") });
}

test.describe("on the study list", () => {
  test("a study's summary is shown with its status, above the abstract", async ({
    page,
  }) => {
    await openWithThreeStudies(page);
    const approved = page.getByRole("article", {
      name: "Study with approved summary",
    });
    await expect(
      approved.getByRole("heading", { name: "Summary (Approved)" }),
    ).toBeVisible();
    await expect(approved.getByText("The approved words.")).toBeVisible();

    const draft = page.getByRole("article", {
      name: "Study with draft summary",
    });
    await expect(
      draft.getByRole("heading", { name: "Summary (Draft)" }),
    ).toBeVisible();
  });

  test("the abstract stays available beside the summary", async ({ page }) => {
    await openWithThreeStudies(page);
    const draft = page.getByRole("article", {
      name: "Study with draft summary",
    });
    await draft.getByText("Abstract", { exact: true }).click();
    await expect(draft.getByText("The draft study's abstract.")).toBeVisible();
  });

  test("a study without a summary shows no summary heading", async ({
    page,
  }) => {
    await openWithThreeStudies(page);
    const none = page.getByRole("article", { name: "Study with no summary" });
    await expect(none.getByRole("heading", { name: /^Summary/ })).toHaveCount(
      0,
    );
  });

  test("passes axe with summaries showing", async ({ page }) => {
    await openWithThreeStudies(page);
    await expectNoAxeViolations(page);
  });
});

test.describe("on the Edit Study page", () => {
  test("shows the summary's words, source, file, status and approval date", async ({
    page,
  }) => {
    await openWithThreeStudies(page);
    await openEditPage(page, "Study with approved summary");
    const section = summarySection(page);
    await expect(
      section.getByRole("textbox", { name: "Summary Text" }),
    ).toHaveValue("The approved words.");
    await expect(section).toContainText("Written from the full text.");
    await expect(section).toContainText("File: Made Up 2019.pdf");
    await expect(section).toContainText(/Status: Approved on \w{3} \d+, 2026/);
    await expectNoAxeViolations(page);
  });

  test("saving the words keeps an approved summary approved", async ({
    page,
  }) => {
    await openWithThreeStudies(page);
    await openEditPage(page, "Study with approved summary");
    const section = summarySection(page);
    await section
      .getByRole("textbox", { name: "Summary Text" })
      .fill("Corrected words.");
    await section.getByRole("button", { name: "Save Summary" }).click();
    await expect(summaryToast(page)).toHaveText("Summary saved.");
    await expect(section).toContainText("Approved on");

    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(page.getByText("Corrected words.")).toBeVisible();
  });

  test("saving unchanged words still confirms", async ({ page }) => {
    await openWithThreeStudies(page);
    await openEditPage(page, "Study with approved summary");
    await summarySection(page)
      .getByRole("button", { name: "Save Summary" })
      .click();
    await expect(summaryToast(page)).toHaveText("Summary saved.");
    await expectNoAxeViolations(page);
  });

  test("saving the words keeps a draft a draft", async ({ page }) => {
    await openWithThreeStudies(page);
    await openEditPage(page, "Study with draft summary");
    const section = summarySection(page);
    await expect(section).toContainText("Status: Draft");
    await expect(
      section.getByRole("button", { name: "Send Back to Review" }),
    ).toHaveCount(0);
    await section.getByRole("button", { name: "Save Summary" }).click();
    await expect(section).toContainText("Status: Draft");
  });

  test("refuses empty words", async ({ page }) => {
    await openWithThreeStudies(page);
    await openEditPage(page, "Study with approved summary");
    const section = summarySection(page);
    await section.getByRole("textbox", { name: "Summary Text" }).fill("  ");
    await section.getByRole("button", { name: "Save Summary" }).click();
    await expect(section).toContainText(
      "Write a summary, or remove it instead.",
    );
    await expectNoAxeViolations(page);
  });

  test("sending it back to review makes it a draft in the review queue", async ({
    page,
  }) => {
    await openWithThreeStudies(page);
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(
      nav.getByRole("link", { name: "Review Summaries (1)" }),
    ).toBeVisible();
    await openEditPage(page, "Study with approved summary");
    const section = summarySection(page);
    await section.getByRole("button", { name: "Send Back to Review" }).click();

    await expect(section).toContainText("Status: Draft");
    await expect(summaryToast(page)).toHaveText("Summary sent back to review.");
    await expect(
      section.getByRole("button", { name: "Send Back to Review" }),
    ).toHaveCount(0);
    await expect(
      nav.getByRole("link", { name: "Review Summaries (2)" }),
    ).toBeVisible();
  });

  test("removing it asks first, and Cancel keeps it", async ({ page }) => {
    await openWithThreeStudies(page);
    await openEditPage(page, "Study with approved summary");
    const section = summarySection(page);
    await section.getByRole("button", { name: "Remove Summary" }).click();
    const dialog = page.getByRole("alertdialog", {
      name: "Remove this summary?",
    });
    await expect(dialog).toContainText("Remove this summary?");
    await expectNoAxeViolations(page);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(
      section.getByRole("textbox", { name: "Summary Text" }),
    ).toHaveValue("The approved words.");
  });

  test("removing it, once confirmed, leaves the study and its abstract", async ({
    page,
  }) => {
    await openWithThreeStudies(page);
    await openEditPage(page, "Study with approved summary");
    const section = summarySection(page);
    await section.getByRole("button", { name: "Remove Summary" }).click();
    await page
      .getByRole("alertdialog", { name: "Remove this summary?" })
      .getByRole("button", { name: "Remove Summary" })
      .click();
    await expect(section).toContainText("This study has no summary.");
    await expect(summaryToast(page)).toHaveText("Summary removed.");
    await expect(
      section.getByRole("textbox", { name: "Summary Text" }),
    ).toHaveCount(0);
    await expect(textField(page, /^Title$/)).toHaveValue(
      "Study with approved summary",
    );
  });

  test("a study with no summary says so and offers nothing to edit", async ({
    page,
  }) => {
    await openWithThreeStudies(page);
    await openEditPage(page, "Study with no summary");
    const section = summarySection(page);
    await expect(section).toContainText("This study has no summary.");
    await expect(section.getByRole("button")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("saving the summary and saving the study's fields do not overwrite each other", async ({
    page,
  }) => {
    await openWithThreeStudies(page);
    await openEditPage(page, "Study with approved summary");
    // A half-edited field survives saving the summary...
    await textField(page, /^Journal$/).fill("Journal of Edited Results");
    const section = summarySection(page);
    await section
      .getByRole("textbox", { name: "Summary Text" })
      .fill("Newer words.");
    await section.getByRole("button", { name: "Save Summary" }).click();
    await expect(textField(page, /^Journal$/)).toHaveValue(
      "Journal of Edited Results",
    );
    // ...and saving the study keeps the summary just saved
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page
      .getByRole("link", { name: "Study with approved summary" })
      .click();
    await expect(textField(page, /^Journal$/)).toHaveValue(
      "Journal of Edited Results",
    );
    await expect(
      summarySection(page).getByRole("textbox", { name: "Summary Text" }),
    ).toHaveValue("Newer words.");
  });
});
