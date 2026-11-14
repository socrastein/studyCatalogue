/**
 * Steps for filling in the study form in browser tests, shared by the specs that add studies through the page.
 */
import { expect, type Page } from "@playwright/test";

/** A text field by its label. */
export function textField(page: Page, label: string | RegExp) {
  return page.getByRole("textbox", { name: label });
}

/** Fills in the publication details: title, two authors pasted PubMed-style, year, journal, DOI. */
export async function fillInPublication(
  page: Page,
  title: string,
): Promise<void> {
  await textField(page, /^Title$/).fill(title);
  await textField(page, /^Authors$/).fill("Schoenfeld BJ, Ogborn D");
  await textField(page, /^Year$/).fill("2017");
  await textField(page, /^Journal$/).fill("Journal of Sports Sciences");
  await textField(page, /^DOI/).fill(
    "https://doi.org/10.1080/02640414.2016.1210197",
  );
}

/**
 * Adds the existing Hypertrophy tag by typing in the tag drop-down and creates "Volume landmarks" in the New Tag box,
 * using only the keyboard.
 */
export async function addTagsByKeyboard(page: Page): Promise<void> {
  const tags = page.getByRole("combobox", { name: "Add to Tags" });
  await tags.fill("hypert");
  await expect(page.getByRole("option", { name: /Hypertrophy/ })).toBeVisible();
  await tags.press("Enter");
  await textField(page, "New Tag").fill("Volume landmarks");
  await page.keyboard.press("Enter");
}

/** Fills in a complete, valid study. */
export async function fillInStudy(page: Page, title: string): Promise<void> {
  await fillInPublication(page, title);
  await addTagsByKeyboard(page);
  await page.getByRole("radio", { name: "Meta-analysis" }).check();
  await page.getByRole("checkbox", { name: "Trained", exact: true }).check();
}
