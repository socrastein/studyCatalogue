/**
 * Browser tests for the tag picker on the study form (a searchable drop-down that adds one tag at a time, chips for the
 * chosen tags, and a New Tag box): the whole list opens without typing, typing narrows it by name and alias, choosing
 * adds a chip and empties the control, a chosen tag is not offered again until its chip is removed, and a new tag can
 * be created. Both colour schemes run every test, so axe covers light and dark.
 */
import { expect, test, type Page } from "@playwright/test";
import { seedTags } from "../src/catalogue/seedTags";
import { expectNoAxeViolations } from "./expectNoAxeViolations";
import { openWithStudies } from "./seedCatalogue";
import { textField } from "./studyFormSteps";

/** The picker's drop-down. */
function tagDropdown(page: Page) {
  return page.getByRole("combobox", { name: "Add to Tags" });
}

/** The chosen tags' chips. */
function chips(page: Page) {
  return page.getByRole("list", { name: "Chosen tags" }).getByRole("listitem");
}

test.beforeEach(async ({ page }) => {
  // Hypertrophy gets an alias, so a search by another name has something to find
  const tags = seedTags().map((tag) =>
    tag.name === "Hypertrophy" ? { ...tag, aliases: ["muscle growth"] } : tag,
  );
  await openWithStudies(page, [], tags);
  await page.goto("/studies/new");
});

test("opening the drop-down lists every tag without typing, in tree order with parents", async ({
  page,
}) => {
  await tagDropdown(page).click();
  const options = page.getByRole("option");
  await expect(options).toHaveCount(seedTags().length);
  // Top-level tags A to Z, each followed by its own subtopics
  await expect(options.nth(0)).toHaveText("Biology");
  await expect(options.nth(1)).toHaveText("Animal Behavior (Biology)");
  await expect(options.filter({ hasText: /^Hypertrophy/ })).toHaveText(
    "Hypertrophy (Exercise Science)",
  );
  await expectNoAxeViolations(page);
});

test("the keyboard opens the whole list too", async ({ page }) => {
  await tagDropdown(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option")).toHaveCount(seedTags().length);
});

test("typing narrows the list by name and by alias", async ({ page }) => {
  await tagDropdown(page).fill("protein");
  await expect(page.getByRole("option")).toHaveText(["Protein (Nutrition)"]);

  await tagDropdown(page).fill("muscle gr");
  await expect(page.getByRole("option")).toHaveText([]);
  await tagDropdown(page).fill("growth");
  await expect(page.getByRole("option")).toHaveText([
    "Hypertrophy (Exercise Science)",
  ]);
});

test("choosing a tag adds a chip and empties the control for the next one", async ({
  page,
}) => {
  await tagDropdown(page).fill("growth");
  await page.getByRole("option", { name: /Hypertrophy/ }).click();

  await expect(chips(page)).toHaveText([/Hypertrophy/]);
  await expect(tagDropdown(page)).toHaveValue("");
  await expect(tagDropdown(page)).toBeFocused();
  await expect(page.getByRole("status").last()).toHaveText("Added Hypertrophy");
});

test("a chosen tag is not offered again until its chip is removed", async ({
  page,
}) => {
  await tagDropdown(page).fill("hypertrophy");
  await page.keyboard.press("Enter");
  await expect(chips(page)).toHaveText([/Hypertrophy/]);

  await tagDropdown(page).fill("hypertrophy");
  await expect(page.getByRole("option")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Remove Hypertrophy" }).click();
  await tagDropdown(page).fill("hypertrophy");
  await expect(page.getByRole("option")).toHaveText([
    "Hypertrophy (Exercise Science)",
  ]);
});

test("a new tag is created from the New Tag box and added, by Enter or by the button", async ({
  page,
}) => {
  await textField(page, "New Tag").fill("Volume landmarks");
  await page.keyboard.press("Enter");
  await expect(chips(page)).toHaveText([/Volume landmarks/]);
  await expect(textField(page, "New Tag")).toHaveValue("");
  // Enter must not have submitted the study form
  await expect(page).toHaveURL(/studies\/new/);

  await textField(page, "New Tag").fill("Rest intervals");
  await page.getByRole("button", { name: "Add New Tag" }).click();
  await expect(chips(page)).toHaveText([/Volume landmarks/, /Rest intervals/]);

  // The new tag is now an ordinary tag: once its chip is removed it is offered like the rest
  await page.getByRole("button", { name: "Remove Rest intervals" }).click();
  await tagDropdown(page).fill("rest");
  await expect(page.getByRole("option")).toHaveText(["Rest intervals"]);
});

test("a blank new tag creates nothing and says so beside the box, where it can be seen", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Add New Tag" }).click();
  await expect(chips(page)).toHaveCount(0);
  await expect(
    page.getByText("Type a name for the new tag first."),
  ).toBeVisible();
  await expect(textField(page, "New Tag")).toBeFocused();
  await expect(textField(page, "New Tag")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expectNoAxeViolations(page);

  // Typing clears the message
  await textField(page, "New Tag").fill("R");
  await expect(
    page.getByText("Type a name for the new tag first."),
  ).toHaveCount(0);
});

test("a tag the study already has is not added twice and the box says it is already chosen", async ({
  page,
}) => {
  await tagDropdown(page).fill("hypertrophy");
  await page.keyboard.press("Enter");
  await expect(chips(page)).toHaveCount(1);

  // By alias, to show the match is the same one the creation would find
  await textField(page, "New Tag").fill("muscle growth");
  await page.getByRole("button", { name: "Add New Tag" }).click();
  await expect(
    page.getByText('"Hypertrophy" is already chosen.'),
  ).toBeVisible();
  await expect(chips(page)).toHaveCount(1);
  await expect(page.getByText(/Created the new tag/)).toHaveCount(0);
  await expect(textField(page, "New Tag")).toHaveValue("muscle growth");
  await expectNoAxeViolations(page);
});

test("the box tells a created tag from an existing tag it added", async ({
  page,
}) => {
  await textField(page, "New Tag").fill("Volume landmarks");
  await page.getByRole("button", { name: "Add New Tag" }).click();
  await expect(
    page.getByText('Created the new tag "Volume landmarks" and added it.'),
  ).toBeVisible();

  await textField(page, "New Tag").fill("protein");
  await page.getByRole("button", { name: "Add New Tag" }).click();
  await expect(
    page.getByText('Added the existing tag "Protein".'),
  ).toBeVisible();
  await expect(page.getByText(/Created the new tag/)).toHaveCount(0);
  await expect(chips(page)).toHaveText([/Volume landmarks/, /Protein/]);
  await expectNoAxeViolations(page);
});
