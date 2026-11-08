/**
 * Picks an option in the library's custom drop-down (DropdownSelect), which Playwright's `selectOption` cannot drive
 * because it is a combobox with a listbox, not a native <select>. Used by the specs that choose a sort order or a tag.
 */
import type { Page } from "@playwright/test";

/**
 * Opens the drop-down with this accessible name and clicks the option with this label.
 *
 * @param page The page the drop-down is on.
 * @param dropdownName The drop-down's label, e.g. "Sort by".
 * @param optionLabel The option's visible label, e.g. "First author, A to Z".
 */
export async function chooseDropdownOption(
  page: Page,
  dropdownName: string,
  optionLabel: string,
): Promise<void> {
  await page.getByRole("combobox", { name: dropdownName }).click();
  await page.getByRole("option", { name: optionLabel, exact: true }).click();
}
