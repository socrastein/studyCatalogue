/**
 * Browser tests for Settings: switching mode and colour (and remembering them), downloading a backup and restoring
 * it, refusing a file that is not a backup, and recovering from unreadable saved data. Axe runs in both modes.
 */
import { expect, test, type Page } from "@playwright/test";
import { STORAGE_KEY } from "../src/stores/catalogueStore";
import { expectNoAxeViolations } from "./expectNoAxeViolations";
import { openWithStudies, studyDetails } from "./seedCatalogue";

/** The mode the page is showing, from the root element. */
function shownMode(page: Page) {
  return page.locator("html");
}

/** The restore file input. Found by id: a file input has no role to find it by, and getByLabel is off limits here. */
function restoreInput(page: Page) {
  return page.locator("#restore-file");
}

test.beforeEach(async ({ page }) => {
  await openWithStudies(page, [studyDetails({ title: "Backed-up study" })]);
  await page.goto("/settings");
});

test("mode and colour apply at once and are remembered", async ({ page }) => {
  await page.getByRole("radio", { name: "Light" }).check();
  await page.getByRole("radio", { name: "Green" }).check();
  await expect(shownMode(page)).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(shownMode(page)).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("radio", { name: "Green" })).toBeChecked();
});

test("Settings has no accessibility violations in light or dark mode", async ({
  page,
}) => {
  await page.getByRole("radio", { name: "Light" }).check();
  await expectNoAxeViolations(page);
  await page.getByRole("radio", { name: "Dark" }).check();
  await expectNoAxeViolations(page);
});

/** Downloads a backup from Settings and returns where Playwright saved it. */
async function downloadBackup(page: Page): Promise<string> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download a backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^study-catalogue-\d{4}-\d{2}-\d{2}\.json$/,
  );
  return download.path();
}

test("a downloaded backup restores the catalogue after confirming", async ({
  page,
}) => {
  const backupPath = await downloadBackup(page);
  await openWithStudies(page, []);
  await page.goto("/settings");
  await restoreInput(page).setInputFiles(backupPath);
  const dialog = page.getByRole("dialog", { name: "Restore this backup?" });
  await expect(dialog).toContainText("The backup holds 1 study");
  await dialog.getByRole("button", { name: "Replace catalogue" }).click();

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
    page.getByText("Your saved catalogue could not be read"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Recover it in Settings" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Your saved catalogue could not be read",
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
  await page.getByRole("button", { name: "Start a new catalogue" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start over" })
    .click();

  await expect(page.getByText("No studies yet.")).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toContain('"schemaVersion":1');
});
