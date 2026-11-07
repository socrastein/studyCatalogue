/**
 * Browser tests for adding, editing and deleting a study: the whole form filled in by keyboard (including the tag
 * combobox), validation with the error summary, the edit page, the delete confirmation, and axe on the form with and
 * without errors showing.
 */
import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./expectNoAxeViolations";

/** A text field by its label. */
function textField(page: Page, label: string | RegExp) {
  return page.getByRole("textbox", { name: label });
}

/** Fills in the publication details: title, two authors pasted PubMed-style, year, journal, DOI. */
async function fillInPublication(page: Page, title: string): Promise<void> {
  await textField(page, /^Title$/).fill(title);
  await textField(page, /^Authors$/).fill("Schoenfeld BJ, Ogborn D");
  await textField(page, /^Year$/).fill("2017");
  await textField(page, /^Journal$/).fill("Journal of Sports Sciences");
  await textField(page, /^DOI/).fill(
    "https://doi.org/10.1080/02640414.2016.1210197",
  );
}

/** Adds the existing Hypertrophy tag and creates "Volume landmarks", using only the keyboard. */
async function addTagsByKeyboard(page: Page): Promise<void> {
  const tags = page.getByRole("combobox", { name: "Tags" });
  await tags.fill("hypert");
  await expect(page.getByRole("option", { name: /Hypertrophy/ })).toBeVisible();
  await tags.press("Enter");
  await tags.fill("Volume landmarks");
  await page.keyboard.press("ArrowDown");
  await tags.press("Enter");
}

/** Fills in a complete, valid study. */
async function fillInStudy(page: Page, title: string): Promise<void> {
  await fillInPublication(page, title);
  await addTagsByKeyboard(page);
  await page.getByRole("radio", { name: "Meta-analysis" }).check();
  await page.getByRole("checkbox", { name: "Trained", exact: true }).check();
}

/** Adds a complete study and opens its edit page from the study list. */
async function addStudyAndOpenIt(page: Page, title: string): Promise<void> {
  await fillInStudy(page, title);
  await page.getByRole("button", { name: "Add study" }).click();
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Edit study",
  );
}

/** The error summary box, found by its heading. */
function errorSummary(page: Page) {
  return page
    .getByRole("heading", { name: "There is a problem" })
    .locator("..");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/studies/new");
});

test("a new study is saved and listed, with a confirmation", async ({
  page,
}) => {
  await fillInStudy(page, "Weekly volume and muscle mass");
  await page.getByRole("button", { name: "Add study" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("status").first()).toHaveText(
    'Added "Weekly volume and muscle mass".',
  );
  await expect(
    page.getByRole("link", { name: "Weekly volume and muscle mass" }),
  ).toBeVisible();
  await expect(page.getByText("Schoenfeld & Ogborn (2017)")).toBeVisible();
});

test("the authors box shows how it read the pasted names", async ({ page }) => {
  await textField(page, /^Authors$/).fill(
    "Brad Jon Schoenfeld, Dan Ogborn and James W. Krieger",
  );
  await expect(
    page
      .getByRole("list", { name: "Read as 3 authors:" })
      .getByRole("listitem"),
  ).toHaveText(["Schoenfeld, B. J.", "Ogborn, D.", "Krieger, J. W."]);
});

test("an organization in braces is read whole and marked as one", async ({
  page,
}) => {
  await textField(page, /^Authors$/).fill(
    "{American College of Sports Medicine}; Smith, Jo",
  );
  await expect(
    page
      .getByRole("list", { name: "Read as 2 authors:" })
      .getByRole("listitem"),
  ).toHaveText([
    "American College of Sports Medicine (organization)",
    "Smith, J.",
  ]);
});

test("the tag combobox adds an existing tag, creates a new one, and removes one", async ({
  page,
}) => {
  await addTagsByKeyboard(page);
  const chosen = page.getByRole("list", { name: "Chosen tags" });
  await expect(chosen.getByRole("listitem")).toHaveText([
    /Hypertrophy/,
    /Volume landmarks/,
  ]);

  await chosen.getByRole("button", { name: "Remove Hypertrophy" }).click();
  await expect(chosen.getByRole("listitem")).toHaveText([/Volume landmarks/]);
  await expect(page.getByRole("combobox", { name: "Tags" })).toBeFocused();
});

test("submitting an empty form lists every problem in a focused summary", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Add study" }).click();

  await expect(errorSummary(page)).toBeFocused();
  await expect(errorSummary(page).getByRole("link")).toHaveText([
    "Enter the study's title.",
    "Enter the authors.",
    "Enter the year it was published.",
    "Enter the journal it was published in.",
    "Choose the study design.",
  ]);
  await expect(textField(page, /^Title$/)).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expectNoAxeViolations(page);
});

test("a link in the error summary puts the cursor in its field", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Add study" }).click();
  await errorSummary(page)
    .getByRole("link", { name: "Enter the year it was published." })
    .click();
  await expect(textField(page, /^Year$/)).toBeFocused();
});

test("the form has no accessibility violations with suggestions open", async ({
  page,
}) => {
  await page.getByRole("combobox", { name: "Tags" }).fill("pro");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expectNoAxeViolations(page);
});

test("an edited study is saved with its changes", async ({ page }) => {
  await addStudyAndOpenIt(page, "Original title");
  await expect(textField(page, /^Year$/)).toHaveValue("2017");
  await textField(page, /^Title$/).fill("Edited title");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("status").first()).toHaveText(
    'Saved changes to "Edited title".',
  );
  await expect(page.getByRole("link", { name: "Edited title" })).toBeVisible();
});

test("a study is deleted after confirming in the dialog", async ({ page }) => {
  await addStudyAndOpenIt(page, "Delete me");
  await page.getByRole("button", { name: "Delete study" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete this study?" });
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await expectNoAxeViolations(page);
  await dialog.getByRole("button", { name: "Delete study" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("status").first()).toHaveText(
    'Deleted "Delete me".',
  );
  await expect(page.getByText("No studies yet.")).toBeVisible();
});

test("cancelling the delete dialog keeps the study and returns focus", async ({
  page,
}) => {
  await addStudyAndOpenIt(page, "Keep me");
  await page.getByRole("button", { name: "Delete study" }).click();
  await page.keyboard.press("Escape");

  await expect(
    page.getByRole("button", { name: "Delete study" }),
  ).toBeFocused();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Keep me" })).toBeVisible();
});

test("an edit link to a missing study says it was not found", async ({
  page,
}) => {
  await page.goto("/studies/does-not-exist/edit");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Study not found",
  );
});
