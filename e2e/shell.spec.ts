/**
 * Browser tests for the app shell: the navigation reaches every page, marks the current one, names the tab after it,
 * moves focus to the new page's heading, and every page passes axe.
 */
import { expect, test } from "@playwright/test";
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
