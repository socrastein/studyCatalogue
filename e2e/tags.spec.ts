/**
 * Browser tests for the tag manager: the tree, adding a tag, editing name, aliases and parents (including refusals),
 * merging duplicates and deleting, with axe on both pages.
 */
import { expect, test, type Page } from "@playwright/test";
import { chooseDropdownOption } from "./chooseDropdownOption";
import { expectNoAxeViolations } from "./expectNoAxeViolations";
import { openWithStudies, studyDetails } from "./seedCatalogue";

/** Opens a tag's edit page from the tree. */
async function openTag(page: Page, name: string): Promise<void> {
  await page.goto("/tags");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `Edit Tag: ${name}`,
  );
}

/** What to type into the edit form: a new name, aliases, and one more parent to choose by keyboard. */
type TagFormInput = { name: string; aliases: string; parent: string };

/** Fills in the edit form. */
async function fillTagForm(page: Page, input: TagFormInput): Promise<void> {
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill(input.name);
  await page.getByRole("textbox", { name: "Other Names" }).fill(input.aliases);
  const parents = page.getByRole("combobox", { name: "Sits Under" });
  await parents.fill(input.parent);
  await parents.press("Enter");
}

/** Merges the open tag into the one with this label, confirming in the dialog. */
async function mergeInto(page: Page, targetLabel: string): Promise<void> {
  await chooseDropdownOption(page, "Merge into", targetLabel);
  await page.getByRole("button", { name: "Merge Tags" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Merge Tags" })
    .click();
}

test.beforeEach(async ({ page }) => {
  await openWithStudies(page, [
    studyDetails({
      title: "Growth study",
      tagIds: ["exercise-science/hypertrophy"],
    }),
    studyDetails({ title: "Size study", tagIds: [] }),
  ]);
});

test("the tree shows subtopics under their subject, with study counts", async ({
  page,
}) => {
  await page.goto("/tags");
  const exerciseScience = page.getByRole("listitem").filter({
    has: page.getByRole("link", { name: "Exercise Science", exact: true }),
  });
  await expect(
    exerciseScience.getByRole("link", { name: "Hypertrophy", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "1 study tagged Hypertrophy" }),
  ).toBeVisible();
  await expectNoAxeViolations(page);
});

test("a new tag is added at the top level, and a duplicate name is refused", async ({
  page,
}) => {
  await page.goto("/tags");
  const newTag = page.getByRole("textbox", { name: "New Tag" });
  await newTag.fill("Sleep");
  await page.getByRole("button", { name: "Add Tag" }).click();
  await expect(
    page.getByRole("link", { name: "Sleep", exact: true }),
  ).toBeVisible();

  await newTag.fill("sleep");
  await page.getByRole("button", { name: "Add Tag" }).click();
  await expect(
    page.getByText('A tag called "Sleep" already exists.'),
  ).toBeVisible();
});

test("a tag is renamed, given an alias and moved, and search finds it by the alias", async ({
  page,
}) => {
  await openTag(page, "Hypertrophy");
  await fillTagForm(page, {
    name: "Muscle hypertrophy",
    aliases: "muscle growth, gains",
    parent: "Strength",
  });
  await page.getByRole("button", { name: "Save Tag" }).click();

  await expect(page).toHaveURL("/tags");
  await expect(page.getByRole("status").first()).toHaveText(
    'Saved the tag "Muscle hypertrophy".',
  );
  await page.goto("/?q=gains");
  await expect(page.getByRole("article")).toHaveCount(1);
});

test("a name another tag has is refused with a message", async ({ page }) => {
  await openTag(page, "Hypertrophy");
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("strength");
  await page.getByRole("button", { name: "Save Tag" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    'Another tag is already called "strength".',
  );
  await expectNoAxeViolations(page);
});

test("merging moves the studies to the kept tag after confirming", async ({
  page,
}) => {
  await openTag(page, "Hypertrophy");
  await mergeInto(page, "Strength (Exercise Science)");

  await expect(page.getByRole("status").first()).toHaveText(
    'Merged "Hypertrophy" into "Strength (Exercise Science)".',
  );
  await expect(
    page.getByRole("link", { name: "Hypertrophy", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "1 study tagged Strength" }),
  ).toBeVisible();
});

test("deleting a tag after confirming removes it", async ({ page }) => {
  await openTag(page, "Hypertrophy");
  await page.getByRole("button", { name: "Delete Tag" }).click();
  const dialog = page.getByRole("alertdialog", {
    name: 'Delete the tag "Hypertrophy"?',
  });
  await expect(dialog).toContainText("It will be removed from 1 study");
  await dialog.getByRole("button", { name: "Delete Tag" }).click();

  await expect(page).toHaveURL("/tags");
  await expect(
    page.getByRole("link", { name: "Hypertrophy", exact: true }),
  ).toHaveCount(0);
});
