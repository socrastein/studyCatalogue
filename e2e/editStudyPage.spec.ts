/**
 * Browser tests for opening the edit page of a study that already exists, in both places the catalogue can live (this
 * browser's localStorage, and the home server's file). The study here holds a summary, as most real studies do: the
 * page once drew only its heading for such a study, because building the form's draft from it threw.
 */
import {
  expect as expectInBrowser,
  test as browserTest,
} from "@playwright/test";
import { test as homeServerTest, expect } from "./homeServerFixture";
import type { Page } from "@playwright/test";
import {
  CATALOGUE_API_PATH,
  saveRequestText,
} from "../src/catalogue/homeServerProtocol";
import { createDraftSummary } from "../src/catalogue/summary";
import {
  catalogueWithSummaries,
  openWithSummaries,
  studyDetails,
  type SeededStudy,
} from "./seedCatalogue";
import { textField } from "./studyFormSteps";

const SEEDED_STUDY: SeededStudy = {
  details: studyDetails({
    title: "A study with a summary",
    year: 2019,
    journal: "Journal of Made-Up Results",
    design: "cohort",
    ageGroups: ["older-adults"],
    sexes: ["female"],
  }),
  summary: createDraftSummary(
    "A made-up summary.",
    "abstract",
    new Date("2026-11-10T10:00:00.000Z"),
  ),
};

/** Opens the study's edit page from the study list and checks the form shows its saved details. */
async function expectEditPageFilledIn(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("link", { name: "A study with a summary" }).click();
  await expectInBrowser(
    page.getByRole("heading", { level: 1, name: "Edit study" }),
  ).toBeVisible();
  await expectInBrowser(textField(page, /^Title$/)).toHaveValue(
    "A study with a summary",
  );
  await expectInBrowser(textField(page, /^Year$/)).toHaveValue("2019");
  await expectInBrowser(
    page.getByRole("radio", { name: "Cohort study" }),
  ).toBeChecked();
  await expectInBrowser(
    page.getByRole("checkbox", { name: /^Older adults/ }),
  ).toBeChecked();
  await expectInBrowser(
    page.getByRole("checkbox", { name: "Female" }),
  ).toBeChecked();
}

browserTest(
  "the edit page of a study with a summary shows the filled-in form (browser storage)",
  async ({ page }) => {
    await openWithSummaries(page, [SEEDED_STUDY]);
    await expectEditPageFilledIn(page);
  },
);

homeServerTest(
  "the edit page of a study with a summary shows the filled-in form (home server)",
  async ({ page, homeServer }) => {
    const saved = await page.request.put(
      new URL(CATALOGUE_API_PATH, homeServer.url).href,
      {
        headers: { "Content-Type": "application/json" },
        data: saveRequestText({
          baseRevision: 0,
          catalogue: catalogueWithSummaries([SEEDED_STUDY]),
        }),
      },
    );
    expect(saved.ok()).toBe(true);
    await expectEditPageFilledIn(page);
  },
);
