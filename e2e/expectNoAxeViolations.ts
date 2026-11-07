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
 * Specs that call this find elements by role (`getByRole("textbox", { name })`), never `getByLabel`: in Playwright's
 * Firefox build for this machine (v1572, the fallback build for an unsupported distribution), any `getByLabel` on a
 * page with many labels makes the next axe run crash the page ("Page crashed"). Found 2026-11-06. The same crash
 * follows a `getByRole(..., { name })` lookup of an element named through `aria-labelledby` (found with the tag
 * combobox), so controls here are named by `<label for>`.
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
