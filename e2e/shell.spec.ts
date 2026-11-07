/**
 * Browser tests for the app shell: the navigation reaches every page, marks the current one, names the tab after it,
 * moves focus to the new page's heading, and every page passes axe. The theme button switches light and dark mode
 * and the choice survives a reload.
 */
import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./expectNoAxeViolations";

const PAGES = [
  { link: "Studies", path: "/", heading: "Studies" },
  { link: "Add a study", path: "/studies/new", heading: "Add a study" },
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
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
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
