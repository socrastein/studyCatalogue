/**
 * Browser tests for filling in a study from its DOI. Crossref is never contacted: every request to it is answered by
 * the test, as a found record, an unknown DOI, or a network failure.
 */
import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./expectNoAxeViolations";

const CROSSREF_URL = "https://api.crossref.org/works/**";

/** The record Crossref returns for Schoenfeld, Ogborn & Krieger (2017), trimmed to the fields the app reads. */
const RECORD = {
  message: {
    title: [
      "Dose-response relationship between weekly resistance training volume and increases in muscle mass",
    ],
    author: [
      { given: "Brad J.", family: "Schoenfeld" },
      { given: "Dan", family: "Ogborn" },
      { given: "James W.", family: "Krieger" },
    ],
    "container-title": ["Journal of Sports Sciences"],
    volume: "35",
    issue: "11",
    page: "1073-1082",
    "published-print": { "date-parts": [[2017, 6, 3]] },
    "published-online": { "date-parts": [[2016, 7, 19]] },
  },
};

/** A text field by the start of its label (optional fields' labels end in "(optional)"). */
function textField(page: Page, label: RegExp) {
  return page.getByRole("textbox", { name: label });
}

/** Types a DOI and presses the fill button. */
async function fillFromDoi(page: Page, doi: string): Promise<void> {
  await textField(page, /^DOI/).fill(doi);
  await page.getByRole("button", { name: "Fill in from DOI" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/studies/new");
});

test("a DOI fills in the publication details, with the print year", async ({
  page,
}) => {
  await page.route(CROSSREF_URL, (route) => route.fulfill({ json: RECORD }));
  await fillFromDoi(page, "https://doi.org/10.1080/02640414.2016.1210197");

  await expect(
    page.getByRole("status").filter({ hasText: "Filled in" }),
  ).toHaveText(
    "Filled in the title, authors, year, journal, volume, issue and pages from Crossref. Check them before saving.",
  );
  await expect(textField(page, /^Title$/)).toHaveValue(
    RECORD.message.title[0] ?? "",
  );
  await expect(textField(page, /^Year$/)).toHaveValue("2017");
  await expect(textField(page, /^Pages/)).toHaveValue("1073-1082");
  await expect(
    page
      .getByRole("list", { name: "Read as 3 authors:" })
      .getByRole("listitem"),
  ).toHaveText(["Schoenfeld, B. J.", "Ogborn, D.", "Krieger, J. W."]);
});

test("the filled-in form has no accessibility violations", async ({ page }) => {
  await page.route(CROSSREF_URL, (route) => route.fulfill({ json: RECORD }));
  await fillFromDoi(page, "10.1080/02640414.2016.1210197");
  await expect(
    page.getByRole("status").filter({ hasText: "Filled in" }),
  ).toBeVisible();
  await expectNoAxeViolations(page);
});

test("a DOI Crossref does not know says so", async ({ page }) => {
  await page.route(CROSSREF_URL, (route) =>
    route.fulfill({ status: 404, body: "Resource not found." }),
  );
  await fillFromDoi(page, "10.1000/unknown");
  await expect(
    page.getByText("Crossref has no record of this DOI."),
  ).toBeVisible();
  await expect(textField(page, /^DOI/)).toHaveAttribute("aria-invalid", "true");
});

test("being offline says Crossref could not be reached", async ({ page }) => {
  await page.route(CROSSREF_URL, (route) =>
    route.abort("internetdisconnected"),
  );
  await fillFromDoi(page, "10.1000/any");
  await expect(page.getByText("Could not reach Crossref.")).toBeVisible();
});

test("a malformed DOI is caught without asking Crossref", async ({ page }) => {
  let requests = 0;
  await page.route(CROSSREF_URL, (route) => {
    requests += 1;
    return route.fulfill({ json: RECORD });
  });
  await fillFromDoi(page, "not a doi");
  await expect(
    page.getByText(
      "Enter a DOI starting with 10., or a doi.org link, to look it up.",
    ),
  ).toBeVisible();
  expect(requests).toBe(0);
});
