/**
 * Browser tests for the app shell: the navigation reaches every page, marks the current one, names the tab after it,
 * moves focus to the new page's heading, and every page passes axe. The theme button switches light and dark mode
 * and the choice survives a reload. At phone width the links move into a menu that opens from a button.
 */
import { expect, test, type Page } from "@playwright/test";
import { createDraftSummary } from "../src/catalogue/summary";
import { expectNoAxeViolations } from "./expectNoAxeViolations";
import { openWithSummaries, studyDetails } from "./seedCatalogue";

const PAGES = [
  { link: "Studies", path: "/", heading: "Studies" },
  { link: "Add a Study", path: "/studies/new", heading: "Add a Study" },
  { link: "Tags", path: "/tags", heading: "Tags" },
  { link: "Settings", path: "/settings", heading: "Settings" },
];

for (const { link, path, heading } of PAGES) {
  test(`the "${link}" nav link opens its page, marked as current`, async ({
    page,
  }) => {
    // Start somewhere else, so the click is a real page change
    await page.goto(path === "/" ? "/tags" : "/");
    const navigation = page.getByRole("navigation", { name: "Main" });
    await navigation.getByRole("link", { name: link, exact: true }).click();

    await expect(page).toHaveURL(path);
    await expect(page).toHaveTitle(`${heading} - Study Catalogue`);
    const pageHeading = page.getByRole("heading", { level: 1 });
    await expect(pageHeading).toHaveText(heading);
    await expect(pageHeading).toBeFocused();
    await expect(
      navigation.getByRole("link", { name: link, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });

  test(`the ${heading} page has no accessibility violations`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

test("the skip link jumps past the navigation to the page content", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to Main Content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

/** Whether the page is showing dark mode: the library's `dark` class on the root element. */
async function isShowingDark(page: Page): Promise<boolean> {
  return page
    .locator("html")
    .evaluate((root) => root.classList.contains("dark"));
}

test("the theme button switches mode, and the choice survives a reload", async ({
  page,
}) => {
  await page.goto("/");
  // Playwright's project decides the starting mode (the system's), so the test works from whichever it is
  const startsDark = await isShowingDark(page);
  const switchName = startsDark
    ? "Switch to light mode"
    : "Switch to dark mode";
  await page.getByRole("button", { name: switchName }).click();

  await expect.poll(() => isShowingDark(page)).toBe(!startsDark);
  await page.reload();
  await expect.poll(() => isShowingDark(page)).toBe(!startsDark);
  await expectNoAxeViolations(page);
});

test.describe("at phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the menu lists the pages, marks the current one, and closes when one is chosen", async ({
    page,
  }) => {
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: "Menu" });
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    const navigation = page.getByRole("navigation", { name: "Main" });
    await expect(
      navigation.getByRole("link", { name: "Studies" }),
    ).toHaveAttribute("aria-current", "page");

    await navigation.getByRole("link", { name: "Tags" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(navigation.getByRole("link", { name: "Tags" })).toBeHidden();
  });

  test("Escape closes the menu and returns focus to its button", async ({
    page,
  }) => {
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: "Menu" });
    await menuButton.click();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(menuButton).toBeFocused();
  });

  test("the open menu has no accessibility violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.locator("#phone-menu-panel")).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

/**
 * The page title must sit fully below the header. The shared library also styles a class called `siteHeader` as a fixed
 * bar, and the catalogue's own header once reused that name, which pulled it out of the page and hid half the title.
 */
const HEADER_WIDTHS = [
  { name: "desktop", width: 1280 },
  { name: "phone", width: 390 },
];

for (const { name, width } of HEADER_WIDTHS) {
  for (const { pageName, path } of [
    { pageName: "Studies", path: "/" },
    { pageName: "Review Summaries", path: "/review" },
  ]) {
    test(`at ${name} width the ${pageName} title is fully below the header`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      // A draft must wait, or the review page has no heading to check
      await openWithSummaries(page, [
        {
          details: studyDetails({ title: "A drafted study", doi: "10.1000/a" }),
          summary: createDraftSummary(
            "A draft.",
            "abstract",
            new Date("2026-11-10T10:00:00.000Z"),
          ),
        },
      ]);
      await page.goto(path);

      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toBeVisible();
      const headerBox = await page.locator("header").first().boundingBox();
      const headingBox = await heading.boundingBox();
      expect(headerBox).not.toBeNull();
      expect(headingBox).not.toBeNull();
      // Non-null: both asserted above
      expect(headingBox!.y).toBeGreaterThanOrEqual(
        headerBox!.y + headerBox!.height,
      );
    });
  }
}

test("plain dev-server use stays silent even if the address was once a home server", async ({
  page,
}) => {
  await page.goto("/");
  // As if an earlier visit had found a home server here; this address now answers with the app's own page, as a dev
  // server does, which is not a missing home server but a different kind of site
  await page.evaluate(() =>
    localStorage.setItem("studyCatalogue.originIsHomeServer", "true"),
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Studies");
  await expect(page.getByText("This is not the home server's")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("studyCatalogue.originIsHomeServer"),
    ),
  ).toBeNull();
});
