/**
 * Puts a catalogue into the app's localStorage before a test, built with the app's own model code so it is always
 * in the current saved format.
 */
import type { Page } from "@playwright/test";
import { newCatalogue, type Catalogue } from "../src/catalogue/catalogue";
import { serializeCatalogue } from "../src/catalogue/serialization";
import { createStudy, type StudyDetails } from "../src/catalogue/study";
import { withSummary, type StudySummary } from "../src/catalogue/summary";
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

/** A study to seed, and the summary it already has, if any. */
export type SeededStudy = { details: StudyDetails; summary?: StudySummary };

/**
 * A catalogue of the seed tags and the given studies, which may hold summaries (drafts or approved).
 *
 * @param studies The studies to hold, in the order given, each with its summary when it has one.
 */
export function catalogueWithSummaries(studies: SeededStudy[]): Catalogue {
  const saved = studies.map(({ details, summary }) => {
    const study = createStudy(details);
    return summary === undefined ? study : withSummary(study, summary);
  });
  return { ...newCatalogue(), studies: saved };
}

/**
 * Like `openWithStudies`, for studies that may hold summaries (drafts or approved).
 *
 * @param page The test's page.
 * @param studies The studies to save, in the order given, each with its summary when it has one.
 */
export async function openWithSummaries(
  page: Page,
  studies: SeededStudy[],
): Promise<void> {
  const catalogue = catalogueWithSummaries(studies);
  await page.goto("/");
  await page.evaluate(([key, text]) => localStorage.setItem(key, text), [
    STORAGE_KEY,
    serializeCatalogue(catalogue),
  ] as const);
  await page.reload();
}
