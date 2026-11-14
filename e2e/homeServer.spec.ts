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

/** Waits for the bottom toast (a status region) to say exactly this; polls long, since the toast shows only for a few seconds. */
async function expectToastSays(page: Page, text: string): Promise<void> {
  await expect(page.getByRole("status").filter({ hasText: text })).toBeVisible({
    timeout: 30_000,
  });
}

/** Makes every save the page sends fail as if the server were away, until `restoreSaving` is called. */
async function makeSavesFail(page: Page): Promise<() => Promise<void>> {
  const route = "**/api/catalogue";
  await page.route(route, (request) =>
    request.request().method() === "PUT" ? request.abort() : request.continue(),
  );
  return () => page.unroute(route);
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
  await expectToastSays(laptop, "Updated with changes from another device.");
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
  // Started before the laptop's edit, as it shows only for a few seconds and the merge comes at some point during it
  const mergeToast = expectToastSays(
    laptop,
    "Changes from another device were merged in.",
  );
  await addStudy(laptop, "Study from the laptop");
  await mergeToast;

  await expect(
    laptop.getByRole("link", { name: "Study from the PC" }),
  ).toBeVisible();
  // The laptop's save was refused and merged, whichever moment it happened at. The merge news is in the toast, so the
  // page's own "Added" confirmation neither replaces it nor is replaced by it.
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

test("the toast confirms that changes are saved once a failed save works again", async ({
  page,
  homeServer,
}) => {
  await page.goto("/");
  const restoreSaving = await makeSavesFail(page);
  await addStudy(page, "Saved late");
  const banner = page
    .getByRole("alert")
    .filter({ hasText: "have not reached" });
  await expect(banner).toBeVisible();

  await restoreSaving();
  await expectToastSays(page, "Your changes are now saved on the home server.");
  await expect(banner).toHaveCount(0);
  await expectServerHolds(page, "Saved late", homeServer.url);
});

test("a failed save's banner stays in view while the page is scrolled", async ({
  page,
}) => {
  await page.goto("/");
  await makeSavesFail(page);
  await addStudy(page, "Never saved");
  const banner = page
    .getByRole("alert")
    .filter({ hasText: "have not reached" });
  await expect(banner).toBeVisible();
  // No axe scan here: Firefox crashes ("Page crashed") whenever axe runs while a save problem is showing, with or
  // without these changes (also on the commit before them). The banner is the same .alert markup axe passes elsewhere.

  // A short window with the page scrolled to the bottom: the banner must still be on screen
  await page.setViewportSize({ width: 800, height: 200 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(banner).toBeInViewport();
});

test("a home server that stops answering is warned about, and Try Again checks it once more", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("alert").filter({ hasText: "not the home server's" }),
  ).toHaveCount(0);

  // The server does not answer on the next start; the app itself still loads from the same address
  await page.route("**/api/catalogue", (request) => request.abort());
  await page.reload();
  const warning = page
    .getByRole("alert")
    .filter({ hasText: "This is not the home server's catalogue." });
  await expect(warning).toContainText("Changes made here will not reach");
  await expectNoAxeViolations(page);
  await page.goto("/settings");
  await expect(page.getByText("Stored in:")).toContainText("This Browser");

  await page.unroute("**/api/catalogue");
  await page.getByRole("button", { name: "Try Again" }).click();
  await expect(page.getByText("Stored in:")).toContainText("This Home Server");
  await expect(warning).toHaveCount(0);
});

/** Opens the Add a Study form through the nav link (no page load, so the page keeps the copy it has) and chooses a tag. */
async function openFormWithTag(page: Page, tagName: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Add a Study" })
    .click();
  const tags = page.getByRole("combobox", { name: "Add to Tags" });
  await tags.fill(tagName);
  await tags.press("Enter");
}

/** The chips of the tags chosen on the open form. */
function chosenTags(page: Page) {
  return page.getByRole("list", { name: "Chosen tags" }).getByRole("listitem");
}

test("a tag another device deleted is taken off the open form, and the form says so", async ({
  page,
  browser,
  homeServer,
  colorScheme,
}) => {
  await page.goto("/");
  const laptop = await openSecondDevice(browser, homeServer.url, colorScheme);
  await openFormWithTag(laptop, "Hypertrophy");
  await expect(chosenTags(laptop)).toHaveText([/Hypertrophy/]);

  // The PC deletes the tag the laptop's form has chosen
  await page.getByRole("link", { name: "Tags", exact: true }).click();
  await page.getByRole("link", { name: "Hypertrophy", exact: true }).click();
  await page.getByRole("button", { name: "Delete Tag" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete Tag" })
    .click();
  await expect
    .poll(async () => {
      const response = await page.request.get(`${homeServer.url}api/catalogue`);
      return JSON.stringify(await response.json());
    })
    .not.toContain('"name":"Hypertrophy"');

  await returnToTab(laptop);
  await expect(
    laptop.getByText(
      'Removed "Hypertrophy" from this study because that tag no longer exists.',
    ),
  ).toBeVisible();
  await expect(chosenTags(laptop)).toHaveCount(0);
  await expectNoAxeViolations(laptop);
  await laptop.context().close();
});

test("two devices that made the same tag leave the open form with one chip, not a dangling tag", async ({
  page,
  browser,
  homeServer,
  colorScheme,
}) => {
  await page.goto("/");
  const laptop = await openSecondDevice(browser, homeServer.url, colorScheme);

  // The PC makes "Shared name" first and it reaches the server
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Add a Study" })
    .click();
  await textField(page, "New Tag").fill("Shared name");
  await page.getByRole("button", { name: "Add New Tag" }).click();
  await expect(chosenTags(page)).toHaveText([/Shared name/]);
  await expect
    .poll(() => serverSharedTagId(page, homeServer.url))
    .toBeDefined();
  const pcTagId = await serverSharedTagId(page, homeServer.url);

  // The laptop, which has not seen that, makes its own: its save is refused and merged, and the server ends up with the
  // laptop's tag instead of the PC's
  await laptop
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Add a Study" })
    .click();
  await textField(laptop, "New Tag").fill("Shared name");
  await laptop.getByRole("button", { name: "Add New Tag" }).click();
  await expect(chosenTags(laptop)).toHaveText([/Shared name/]);
  await expect
    .poll(() => serverSharedTagId(page, homeServer.url))
    .not.toBe(pcTagId);

  // The PC picks up the merged catalogue, where its own tag's id is gone: its form moves to the surviving one
  await returnToTab(page);
  await expect(chosenTags(page)).toHaveText([/Shared name/]);
  await expect(page.getByText(/no longer exists/)).toHaveCount(0);
  await laptop.context().close();
});

/** The id of the tag named "Shared name" in the server's copy; undefined while it holds none. */
async function serverSharedTagId(
  page: Page,
  url: string,
): Promise<string | undefined> {
  const response = await page.request.get(`${url}api/catalogue`);
  const copy = (await response.json()) as {
    catalogue: { tags: { id: string; name: string }[] };
  };
  return copy.catalogue.tags.find((tag) => tag.name === "Shared name")?.id;
}
