/**
 * Browser tests for the browse page: the searches the catalogue exists for ("hypertrophy in trained lifters,
 * meta-analyses only"; "joint pain in older adults"), filters kept in the URL, tag links, the note about studies that
 * do not report a facet, copying a citation, and axe.
 */
import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./expectNoAxeViolations";
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
    abstract: "Joint pain outcomes",
    year: 2016,
  }),
];

/** The titles of the study cards shown, top to bottom. */
function shownTitles(page: Page) {
  return page.getByRole("article").getByRole("heading", { level: 2 });
}

/** Adds a topic filter by typing its name and pressing Enter. */
async function filterByTopic(page: Page, text: string): Promise<void> {
  const topics = page.getByRole("combobox", { name: "Topics" });
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

test("finds hypertrophy meta-analyses in trained lifters, and puts the search in the URL", async ({
  page,
}) => {
  await filterByTopic(page, "Hypertrophy");
  await page
    .getByRole("group", { name: "Training status" })
    .getByRole("checkbox", { name: "Trained", exact: true })
    .check();
  await page
    .getByRole("group", { name: "Study design" })
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
    .getByRole("group", { name: "Age group" })
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
  await page.getByRole("button", { name: "Clear all filters" }).first().click();
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

test("copying a citation announces it", async ({ page }) => {
  const card = page
    .getByRole("article")
    .filter({ hasText: "Hypertrophy in beginners" });
  await card.getByRole("button", { name: "APA" }).click();
  await expect(page.getByText("Copied the APA citation.")).toBeAttached();
});

test("the browse page has no accessibility violations, with and without filters", async ({
  page,
}) => {
  await expectNoAxeViolations(page);
  await page.getByRole("searchbox", { name: "Search" }).fill("joint");
  await page
    .getByRole("group", { name: "Age group" })
    .getByRole("checkbox", { name: "Older adults (65+)" })
    .check();
  await page.getByRole("article").first().getByText("Abstract").click();
  await expectNoAxeViolations(page);
});

test("on a phone the filters start folded away", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.reload();
  await expect(page.getByRole("searchbox", { name: "Search" })).toBeHidden();
  await page.getByText("Filters").click();
  await expect(page.getByRole("searchbox", { name: "Search" })).toBeVisible();
});
