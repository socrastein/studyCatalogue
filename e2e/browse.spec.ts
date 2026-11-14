/**
 * Browser tests for the browse page: the searches the catalogue exists for ("hypertrophy in trained lifters,
 * meta-analyses only"; "joint pain in older adults"), filters kept in the URL, tag links, the note about studies that
 * do not report a facet, copying a citation, sorting, and axe.
 */
import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./expectNoAxeViolations";
import { chooseDropdownOption } from "./chooseDropdownOption";
import { openWithStudies, studyDetails } from "./seedCatalogue";

const STUDIES = [
  studyDetails({
    title: "Volume and hypertrophy in trained men",
    tagIds: ["exercise-science/hypertrophy"],
    design: "meta-analysis",
    trainingStatuses: ["trained"],
    year: 2019,
  }),
  studyDetails({
    title: "Hypertrophy in beginners",
    tagIds: ["exercise-science/hypertrophy"],
    design: "meta-analysis",
    trainingStatuses: ["untrained"],
    year: 2018,
  }),
  studyDetails({
    title: "Resistance training for knee osteoarthritis",
    tagIds: ["exercise-science/pain-injury"],
    abstract: "Exercise reduced joint pain in adults over 65.",
    ageGroups: ["older-adults"],
    year: 2021,
  }),
  studyDetails({
    title: "Joint pain and protein",
    tagIds: ["nutrition/protein"],
    // Reports no age group: the study the "does not report" note counts
    ageGroups: [],
    abstract: "Joint pain outcomes",
    year: 2016,
  }),
];

/** The titles of the study cards shown, top to bottom. */
function shownTitles(page: Page) {
  return page.getByRole("article").getByRole("heading", { level: 2 });
}

/** Adds a topic filter by typing in the topic drop-down and pressing Enter. */
async function filterByTopic(page: Page, text: string): Promise<void> {
  const topics = page.getByRole("combobox", { name: "Add to Topics" });
  await topics.fill(text);
  await expect(page.getByRole("option").first()).toBeVisible();
  await topics.press("Enter");
}

test.beforeEach(async ({ page }) => {
  await openWithStudies(page, STUDIES);
});

test("lists every study, newest first, with a count", async ({ page }) => {
  await expect(page.getByText("4 studies", { exact: true })).toBeVisible();
  await expect(shownTitles(page)).toHaveText([
    "Resistance training for knee osteoarthritis",
    "Volume and hypertrophy in trained men",
    "Hypertrophy in beginners",
    "Joint pain and protein",
  ]);
});

test("the Topics drop-down lists every topic without typing", async ({
  page,
}) => {
  await page.getByRole("combobox", { name: "Add to Topics" }).click();
  await expect(page.getByRole("option").first()).toHaveText("Biology");
  await expect(
    page.getByRole("option", { name: "Hypertrophy (Exercise Science)" }),
  ).toBeVisible();
});

test("finds hypertrophy meta-analyses in trained lifters, and puts the search in the URL", async ({
  page,
}) => {
  await filterByTopic(page, "Hypertrophy");
  await page
    .getByRole("group", { name: "Training Status" })
    .getByRole("checkbox", { name: "Trained", exact: true })
    .check();
  await page
    .getByRole("group", { name: "Study Design" })
    .getByRole("checkbox", { name: "Meta-analysis" })
    .check();

  await expect(shownTitles(page)).toHaveText([
    "Volume and hypertrophy in trained men",
  ]);
  await expect(page.getByText("1 of 4 studies match")).toBeVisible();
  await expect(page).toHaveURL(/tag=exercise-science(%2F|\/)hypertrophy/);
});

test("filters in the URL survive a reload", async ({ page }) => {
  await page.goto("/?tag=exercise-science/hypertrophy&training=trained");
  await expect(shownTitles(page)).toHaveText([
    "Volume and hypertrophy in trained men",
  ]);
  await page.reload();
  await expect(shownTitles(page)).toHaveText([
    "Volume and hypertrophy in trained men",
  ]);
});

test("finds joint pain in older adults, and notes the study that does not report age", async ({
  page,
}) => {
  await page.getByRole("searchbox", { name: "Search" }).fill("joint pain");
  await page
    .getByRole("group", { name: "Age Group" })
    .getByRole("checkbox", { name: "Older adults (65+)" })
    .check();

  await expect(shownTitles(page)).toHaveText([
    "Resistance training for knee osteoarthritis",
  ]);
  await expect(
    page.getByText("1 more study matches but does not report age group."),
  ).toBeVisible();
});

test("a topic on a card links to the list filtered by it", async ({ page }) => {
  await page
    .getByRole("article")
    .filter({ hasText: "Joint pain and protein" })
    .getByRole("link", { name: "Protein", exact: true })
    .click();
  await expect(shownTitles(page)).toHaveText(["Joint pain and protein"]);
});

test("shows a way out when nothing matches", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Search" }).fill("zebrafish");
  await expect(page.getByText("No studies match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear All Filters" }).first().click();
  await expect(shownTitles(page)).toHaveCount(4);
});

test("returning from an edit page restores the filtered list", async ({
  page,
}) => {
  await page.getByRole("searchbox", { name: "Search" }).fill("beginners");
  await expect(shownTitles(page)).toHaveCount(1);
  await page
    .getByRole("link", { name: "Edit Hypertrophy in beginners" })
    .click();
  await page.goBack();
  await expect(shownTitles(page)).toHaveText(["Hypertrophy in beginners"]);
});

test("copying a citation shows a confirmation that goes away by itself", async ({
  page,
}) => {
  const card = page
    .getByRole("article")
    .filter({ hasText: "Hypertrophy in beginners" });
  const confirmation = page.getByText("APA copied to clipboard.");

  await card.getByRole("button", { name: "APA, copy APA citation" }).click();
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toBeHidden({ timeout: 6000 });
});

test("the MD button names Markdown in its confirmation", async ({ page }) => {
  const card = page
    .getByRole("article")
    .filter({ hasText: "Hypertrophy in beginners" });
  await card
    .getByRole("button", { name: "MD, copy Markdown citation" })
    .click();
  await expect(page.getByText("Markdown copied to clipboard.")).toBeVisible();
});

test("the browse page has no accessibility violations, with and without filters", async ({
  page,
}) => {
  await expectNoAxeViolations(page);
  await page.getByRole("searchbox", { name: "Search" }).fill("joint");
  await page
    .getByRole("group", { name: "Age Group" })
    .getByRole("checkbox", { name: "Older adults (65+)" })
    .check();
  await page.getByRole("article").first().getByText("Abstract").click();
  await expectNoAxeViolations(page);
});

test("an abstract unfolds and folds again from its button", async ({
  page,
}) => {
  const toggle = page
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Abstract" });
  const abstractText = page.getByRole("article").first().locator("p").last();

  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(abstractText).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(abstractText).toBeVisible();
  await toggle.click();
  await expect(abstractText).toBeHidden();
});

test("on a phone the filters start folded away", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.reload();
  await expect(page.getByRole("searchbox", { name: "Search" })).toBeHidden();
  await page.getByText("Filters").click();
  await expect(page.getByRole("searchbox", { name: "Search" })).toBeVisible();
});

/** A study known by its first author and year, e.g. "Krieger 2010", for checking the sort orders. */
function studyByAuthor(family: string, year: number) {
  return studyDetails({
    title: `${family} ${year}`,
    year,
    authors: [{ kind: "person", family, given: "J." }],
  });
}

const SORTABLE_STUDIES = [
  studyByAuthor("Krieger", 2010),
  studyByAuthor("Schoenfeld", 2017),
  studyByAuthor("Androulakis", 2021),
];

test("the list can be sorted, and the order stays in the URL alongside the filters", async ({
  page,
}) => {
  await openWithStudies(page, SORTABLE_STUDIES);
  const titles = page.getByRole("article").getByRole("heading");
  const newestFirst = ["Androulakis 2021", "Schoenfeld 2017", "Krieger 2010"];
  await expect(titles).toHaveText(newestFirst);

  await chooseDropdownOption(page, "Sort By", "First author, A to Z");
  await expect(page).toHaveURL("/?sort=author");
  const byAuthor = ["Androulakis 2021", "Krieger 2010", "Schoenfeld 2017"];
  await expect(titles).toHaveText(byAuthor);

  await page.getByRole("searchbox", { name: "Search" }).fill("2");
  await expect(page).toHaveURL("/?q=2&sort=author");
  await expectNoAxeViolations(page);
});
