/**
 * Puts a catalogue into the app's localStorage before a test, built with the app's own model code so it is always
 * in the current saved format.
 */
import type { Page } from "@playwright/test";
import { newCatalogue } from "../src/catalogue/catalogue";
import { serializeCatalogue } from "../src/catalogue/serialization";
import { createStudy, type StudyDetails } from "../src/catalogue/study";
import { exampleStudyDetails } from "../src/catalogue/testFixtures";
import { STORAGE_KEY } from "../src/stores/catalogueStore";

/** A complete study (Schoenfeld et al. 2017, as in the unit tests) with any details replaced. */
export function studyDetails(overrides: Partial<StudyDetails>): StudyDetails {
  return exampleStudyDetails(overrides);
}

/**
 * Opens the app with a catalogue of the seed tags and the given studies saved, then reloads so the app reads it.
 *
 * @param page The test's page.
 * @param studies The studies to save, in the order given.
 */
export async function openWithStudies(
  page: Page,
  studies: StudyDetails[],
): Promise<void> {
  const catalogue = {
    ...newCatalogue(),
    studies: studies.map((details) => createStudy(details)),
  };
  await page.goto("/");
  await page.evaluate(([key, text]) => localStorage.setItem(key, text), [
    STORAGE_KEY,
    serializeCatalogue(catalogue),
  ] as const);
  await page.reload();
}
