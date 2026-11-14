/**
 * Browser tests for Settings: downloading a backup, adding one to the catalogue, restoring one in its place, refusing
 * a file that is not a backup, and recovering from unreadable saved data.
 */
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { STORAGE_KEY } from "../src/stores/catalogueStore";
import { expectNoAxeViolations } from "./expectNoAxeViolations";
import { createDraftSummary } from "../src/catalogue/summary";
import {
  openWithStudies,
  openWithSummaries,
  studyDetails,
} from "./seedCatalogue";

/** The add-a-backup file input, found by id like `restoreInput`. */
function addInput(page: Page) {
  return page.locator("#add-backup-file");
}

/** The restore file input. Found by id: a file input has no role to find it by, and getByLabel is off limits here. */
function restoreInput(page: Page) {
  return page.locator("#restore-file");
}

/** Waits for a status region (the bottom toast) that says exactly this. */
async function expectToastSays(page: Page, text: string): Promise<void> {
  await expect(
    page.getByRole("status").filter({ hasText: text }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await openWithStudies(page, [studyDetails({ title: "Backed-up study" })]);
  await page.goto("/settings");
});

test("Settings has no accessibility violations", async ({ page }) => {
  await expectNoAxeViolations(page);
});

test("Settings says the catalogue is stored in this browser", async ({
  page,
}) => {
  await expect(page.getByText("Stored in:")).toContainText("This Browser");
});

/** Downloads a backup from Settings and returns where Playwright saved it. */
async function downloadBackup(page: Page): Promise<string> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download a Backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^study-catalogue-\d{4}-\d{2}-\d{2}\.json$/,
  );
  return download.path();
}

test("a backup is added to the catalogue after confirming, keeping what was here", async ({
  page,
}) => {
  const backupPath = await downloadBackup(page);
  // A different study, without the backed-up study's DOI, so the two are not taken for one
  await openWithStudies(page, [
    studyDetails({ title: "Already here", doi: null }),
  ]);
  await page.goto("/settings");
  await addInput(page).setInputFiles(backupPath);
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("It adds 1 new study.");
  await dialog.getByRole("button", { name: "Add Backup" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("status").first()).toContainText("1 new study");
  for (const title of ["Already here", "Backed-up study"]) {
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  }
});

test("a backup with nothing new changes nothing and says so, without asking", async ({
  page,
}) => {
  const backupPath = await downloadBackup(page);
  await addInput(page).setInputFiles(backupPath);

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("status").first()).toContainText(
    "everything in it is already here",
  );
});

test("adding is not offered while the saved catalogue cannot be read", async ({
  page,
}) => {
  await breakSavedData(page);
  await page.goto("/settings");
  await expect(addInput(page)).toHaveCount(0);
  await expect(restoreInput(page)).toBeVisible();
});

test("a downloaded backup restores the catalogue after confirming", async ({
  page,
}) => {
  const backupPath = await downloadBackup(page);
  await openWithStudies(page, []);
  await page.goto("/settings");
  await restoreInput(page).setInputFiles(backupPath);
  const dialog = page.getByRole("alertdialog", {
    name: "Restore this backup?",
  });
  await expect(dialog).toContainText("The backup holds 1 study");
  await dialog.getByRole("button", { name: "Replace Catalogue" }).click();

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Backed-up study" }),
  ).toBeVisible();
});

test("a file that is not a backup is refused with the reason", async ({
  page,
}) => {
  await restoreInput(page).setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hello": "world"}'),
  });
  await expect(page.getByRole("alert")).toContainText(
    '"notes.json" cannot be restored.',
  );
});

/** Replaces the saved catalogue with text that cannot be read, then opens the study list. */
async function breakSavedData(page: Page): Promise<void> {
  await page.evaluate(
    (key) => localStorage.setItem(key, "{broken"),
    STORAGE_KEY,
  );
  await page.goto("/");
}

test("unreadable saved data is flagged on every page, with a link to recover it", async ({
  page,
}) => {
  await breakSavedData(page);
  await expect(
    page.getByText("Your Saved Catalogue Could Not Be Read"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Recover it in Settings" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Your Saved Catalogue Could Not Be Read",
    }),
  ).toBeVisible();
});

test("unreadable saved data is kept until the person starts over", async ({
  page,
}) => {
  await breakSavedData(page);
  await page.goto("/settings");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe("{broken");
  await page.getByRole("button", { name: "Start a New Catalogue" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Start Over" })
    .click();

  await expect(page.getByText("No studies yet.")).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toContain('"schemaVersion":2');
});

test("Export for the Website downloads the approved summaries and no abstracts, and says how many studies have one", async ({
  page,
}) => {
  const when = new Date("2026-11-10T10:00:00.000Z");
  const approved = {
    ...createDraftSummary("Approved words.", "fullText", when),
  };
  approved.approvedAt = "2026-11-11T10:00:00.000Z";
  await openWithSummaries(page, [
    {
      details: studyDetails({
        title: "Approved study",
        abstract: "The publisher abstract.",
        doi: "10.1000/a",
      }),
      summary: approved,
    },
    {
      details: studyDetails({ title: "Draft study", doi: "10.1000/b" }),
      summary: createDraftSummary("Unapproved draft words.", "abstract", when),
    },
    { details: studyDetails({ title: "Plain study", doi: "10.1000/c" }) },
  ]);
  await page.goto("/settings");
  await expect(
    page.getByText("1 of 3 studies have an approved summary"),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export for the Website" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^study-catalogue-website-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const text = readFileSync(await download.path(), "utf8");

  expect(text).toContain("Approved words.");
  expect(text).not.toContain("The publisher abstract.");
  expect(text).not.toContain("Unapproved draft words.");
  expect(JSON.parse(text).studies).toHaveLength(3);
  await expectToastSays(
    page,
    `Exported 3 studies (1 with a summary) to "${download.suggestedFilename()}".`,
  );
});

test("each download button says where the file goes and confirms what it started", async ({
  page,
}) => {
  const hints = page.getByText("The file goes to your browser's downloads");
  await expect(hints).toHaveCount(2);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download a Backup" }).click();
  const download = await downloadPromise;
  await expectToastSays(
    page,
    `Started the download of the backup "${download.suggestedFilename()}".`,
  );
  await expectNoAxeViolations(page);
});

test("the unreadable data's download is confirmed too", async ({ page }) => {
  await breakSavedData(page);
  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download the Unreadable Data" })
    .click();
  await downloadPromise;
  await expectToastSays(
    page,
    'Started the download of the unreadable data as "study-catalogue-unreadable.txt".',
  );
});
