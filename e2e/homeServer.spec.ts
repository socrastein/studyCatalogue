/**
 * Browser tests for running at home: the built app served by the home server keeps the catalogue in the server's
 * file, so a reload (or another device) sees it, and two devices editing at once both keep their changes. Each test
 * has its own server and data directory (homeServerFixture.ts).
 */
import { type Browser, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./expectNoAxeViolations";
import { expect, test } from "./homeServerFixture";
import { fillInStudy, textField } from "./studyFormSteps";

/** A color scheme as Playwright names it. */
type ColorScheme = "light" | "dark" | "no-preference" | null | undefined;

/** Opens a second browser, as another device would: its own storage, the same server address. */
async function openSecondDevice(
  browser: Browser,
  url: string,
  colorScheme: ColorScheme,
): Promise<Page> {
  const context = await browser.newContext({ baseURL: url, colorScheme });
  const page = await context.newPage();
  await page.goto("/");
  return page;
}

/**
 * Adds a complete study through the form and waits until it is listed. The form is reached through the nav link, not
 * `goto`: a page load would fetch the server's newest copy, and the tests below need a page that has not.
 */
async function addStudy(page: Page, title: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Add a Study" })
    .click();
  await fillInStudy(page, title);
  // A study with another title but the same DOI is taken for the same study by a merge, so each gets its own DOI
  const uniqueDoi = `10.1000/${title.toLowerCase().replaceAll(" ", "-")}`;
  await textField(page, /^DOI/).fill(uniqueDoi);
  await page.getByRole("button", { name: "Add Study" }).click();
  await expect(page.getByRole("link", { name: title })).toBeVisible();
}

/** Waits until the server holds a study with this title (the app saves a moment after the edit). */
async function expectServerHolds(
  page: Page,
  title: string,
  url: string,
): Promise<void> {
  await expect
    .poll(async () => {
      const response = await page.request.get(`${url}api/catalogue`);
      return JSON.stringify(await response.json());
    })
    .toContain(`"title":"${title}"`);
}

/** Counts the saves the server refused (409) as the page sends them; read `count` when needed. */
function countRefusedSaves(page: Page): { count: number } {
  const refused = { count: 0 };
  page.on("response", (response) => {
    const isSave = response.request().method() === "PUT";
    if (isSave && response.status() === 409) refused.count += 1;
  });
  return refused;
}

/** Tells the page it became visible again, as switching back to its tab does. */
async function returnToTab(page: Page): Promise<void> {
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
}

test("a study added at home is still there after a reload", async ({
  page,
  homeServer,
}) => {
  await page.goto("/");
  await addStudy(page, "Saved on the server");
  await expectServerHolds(page, "Saved on the server", homeServer.url);

  // The browser's own storage is not involved: clear it, and the study still comes back from the server
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Saved on the server" }),
  ).toBeVisible();
});

test("a second device sees the first device's study when it returns to its tab", async ({
  page,
  browser,
  homeServer,
  colorScheme,
}) => {
  const laptop = await openSecondDevice(browser, homeServer.url, colorScheme);
  await expect(laptop.getByText("No studies yet.")).toBeVisible();

  await page.goto("/");
  await addStudy(page, "Added on the PC");
  await expectServerHolds(page, "Added on the PC", homeServer.url);

  await returnToTab(laptop);
  await expect(
    laptop.getByRole("link", { name: "Added on the PC" }),
  ).toBeVisible();
  await laptop.context().close();
});

test("two devices editing different studies at once both keep their edits", async ({
  page,
  browser,
  homeServer,
  colorScheme,
}) => {
  await page.goto("/");
  const laptop = await openSecondDevice(browser, homeServer.url, colorScheme);

  // Both pages started from the same empty catalogue; the PC saves first, so the laptop's save is refused and merged
  await addStudy(page, "Study from the PC");
  await expectServerHolds(page, "Study from the PC", homeServer.url);
  const refusedSaves = countRefusedSaves(laptop);
  await addStudy(laptop, "Study from the laptop");

  await expect(
    laptop.getByRole("link", { name: "Study from the PC" }),
  ).toBeVisible();
  // The laptop's save was refused and merged, whichever moment it happened at. The merge notice itself is not checked
  // here: a tag made in the form is saved (and refused) before the study is added, and the "Added" confirmation that
  // follows replaces the notice, so which of the two the status shows depends on timing. The notice has a unit test.
  await expect.poll(() => refusedSaves.count).toBeGreaterThan(0);
  await expectServerHolds(laptop, "Study from the laptop", homeServer.url);

  await returnToTab(page);
  for (const title of ["Study from the PC", "Study from the laptop"]) {
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  }
  await laptop.context().close();
});

test("Settings says the catalogue is stored on the home server, with no accessibility violations", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByText("Stored in:")).toContainText("This Home Server");
  await expectNoAxeViolations(page);
});

test("the app's pages reload on their own address, not only from the start page", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settings");
});
