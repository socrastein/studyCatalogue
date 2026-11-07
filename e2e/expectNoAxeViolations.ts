/**
 * Shared accessibility check for the browser tests: runs axe on the whole page against WCAG 2.2 A and AA.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

type AxeViolation = Awaited<
  ReturnType<AxeBuilder["analyze"]>
>["violations"][number];

/** The axe rule tags for WCAG 2.0, 2.1 and 2.2 at levels A and AA, the standard this app is held to. */
const WCAG_AA_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

/**
 * Fails the test with axe's list of problems if the page as it stands has any WCAG 2.2 AA violation.
 *
 * Specs that call this find elements by role (`getByRole("textbox", { name })`), never `getByLabel`, and the app names
 * controls with `<label for>` rather than `aria-labelledby` where it can. The reason is a Firefox bug: the page crashes
 * ("Page crashed") when an element's `ariaLabelledByElements` is read both by Playwright's locators, which compute
 * accessible names in their own isolated script world, and by the page's scripts, here axe (its `aria-prohibited-attr`
 * and `hidden-content` rules). `getByLabel` reads it on every element with `aria-labelledby`, so any such element on
 * the page crashes the next axe run; `getByRole` with a name reads it only on elements of that role. It is a
 * regression in Playwright 1.65.0's Firefox, also seen on Windows, tracked as microsoft/playwright#43967 and Mozilla
 * bug 2090055. Once Playwright ships a fixed Firefox, `getByLabel` is safe again. Found 2026-11-06.
 *
 * @param page The page to check, in the state to check it in.
 */
export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_AA_TAGS)
    .analyze();
  const problems = results.violations.flatMap(describeViolation);
  expect(problems).toEqual([]);
}

/**
 * One readable line per element that breaks an axe rule, e.g.
 * "color-contrast: #studyFormConfirmButton: Element has insufficient color contrast of 3.1 ...".
 */
function describeViolation(violation: AxeViolation): string[] {
  return violation.nodes.map(
    (node) =>
      `${violation.id}: ${node.target.join(" ")}: ${node.failureSummary}`,
  );
}
