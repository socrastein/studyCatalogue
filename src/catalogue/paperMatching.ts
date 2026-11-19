/**
 * Matches the paper files in Matt's papers folder to the studies in the catalogue, for the Fetch page: which studies
 * still have no PDF, and which files matched no study or could be several (so nothing falls through silently). A file
 * belongs to a study when the study's first author has the file's surname and the study has the file's year. When
 * several studies share both, the title decides; a tie leaves the file ambiguous. Pure: the caller supplies the
 * studies and the file names (paperFileName.ts reads the names).
 */
import { filingName } from "./citations/authorNames";
import {
  comparableText,
  distinguishingWords,
  parsePaperFileName,
  type PaperFileName,
} from "./paperFileName";
import type { Study } from "./study";

/** A file that did not belong to exactly one study, and why. */
export type UnmatchedFile =
  /** The name is not in the form "(Surname, Year) Short Title.pdf", so no study can be looked up. */
  | { kind: "notPaperName"; fileName: string }
  /** No study has this first author and year. */
  | { kind: "noStudy"; fileName: string }
  /** Several studies have this first author and year, and the titles do not pick one. */
  | { kind: "ambiguous"; fileName: string; candidates: readonly Study[] };

/** The Fetch page's data: the studies with no file, and the files that did not belong to one study. */
export type PaperMatches = {
  /** Sorted by first author's name, then year, then title. */
  studiesWithoutPaper: Study[];
  unmatchedFiles: UnmatchedFile[];
};

/** What one file came to: the study it belongs to, or the reason it belongs to none. */
type FileOutcome =
  | { kind: "matched"; study: Study }
  | { kind: "unmatched"; file: UnmatchedFile };

/**
 * Which studies have no PDF on file, and which files do not belong to exactly one study.
 *
 * @param studies Every study in the catalogue.
 * @param fileNames The names of the PDFs in the papers folder, without their folders.
 * @returns The studies no file matched and the files that matched none or several.
 */
export function matchPapers(
  studies: readonly Study[],
  fileNames: readonly string[],
): PaperMatches {
  const studyIdsWithPaper = new Set<string>();
  const unmatchedFiles: UnmatchedFile[] = [];
  for (const fileName of fileNames) {
    const outcome = matchFile(fileName, studies);
    if (outcome.kind === "matched") studyIdsWithPaper.add(outcome.study.id);
    else unmatchedFiles.push(outcome.file);
  }
  const studiesWithoutPaper = studies
    .filter((study) => !studyIdsWithPaper.has(study.id))
    .sort(compareForFetching);
  return { studiesWithoutPaper, unmatchedFiles };
}

/**
 * The study one file belongs to, or the reason it belongs to none.
 *
 * @param fileName A file name without its folder.
 * @param studies Every study in the catalogue.
 */
function matchFile(fileName: string, studies: readonly Study[]): FileOutcome {
  const parsed = parsePaperFileName(fileName);
  if (parsed === null) {
    return { kind: "unmatched", file: { kind: "notPaperName", fileName } };
  }
  const candidates = studies.filter((study) =>
    hasSameAuthorAndYear(study, parsed),
  );
  return chooseCandidate(parsed, candidates);
}

/**
 * The one study a file belongs to among the studies with its author and year.
 *
 * @param parsed The file's parts.
 * @param candidates The studies with the file's first author and year, in catalogue order.
 */
function chooseCandidate(
  parsed: PaperFileName,
  candidates: readonly Study[],
): FileOutcome {
  if (candidates.length === 0) {
    return {
      kind: "unmatched",
      file: { kind: "noStudy", fileName: parsed.fileName },
    };
  }
  const best = studiesSharingMostTitleWords(parsed.shortTitle, candidates);
  const [onlyBest] = best;
  // A lone candidate is always the best, so only several tied candidates fall through to ambiguous
  if (best.length === 1 && onlyBest !== undefined)
    return { kind: "matched", study: onlyBest };
  return {
    kind: "unmatched",
    file: { kind: "ambiguous", fileName: parsed.fileName, candidates },
  };
}

/**
 * The candidates whose titles share the most words with the file's short title: all of them when they tie.
 *
 * @param shortTitle The title words from the file's name.
 * @param candidates The studies to compare, in catalogue order.
 */
function studiesSharingMostTitleWords(
  shortTitle: string,
  candidates: readonly Study[],
): Study[] {
  const sharedCounts = candidates.map((study) =>
    sharedTitleWordCount(shortTitle, study.title),
  );
  const bestCount = Math.max(...sharedCounts);
  return candidates.filter(
    (_study, index) => sharedCounts[index] === bestCount,
  );
}

/**
 * Whether a study's first author has the file's surname and the study has the file's year. A study whose first author
 * is an organization has no surname, so no file matches it by surname.
 *
 * @param study A study in the catalogue.
 * @param parsed The file's parts.
 */
function hasSameAuthorAndYear(study: Study, parsed: PaperFileName): boolean {
  const firstAuthor = study.authors[0];
  if (firstAuthor?.kind !== "person") return false;
  return (
    study.year === parsed.year &&
    comparableText(firstAuthor.family) === comparableText(parsed.surname)
  );
}

/**
 * How many title words two titles have in common, counting each word once (see `distinguishingWords`).
 *
 * @param shortTitle The title words from the file's name.
 * @param studyTitle The study's full title.
 */
function sharedTitleWordCount(shortTitle: string, studyTitle: string): number {
  const fileWords = distinguishingWords(shortTitle);
  const studyWords = distinguishingWords(studyTitle);
  return [...fileWords].filter((word) => studyWords.has(word)).length;
}

/**
 * The order of the Fetch page: by the first author's name, then the year, then the title. Names compare with case and
 * accents ignored, so "Ásgeirsdóttir" sorts with the A's.
 *
 * @param first One study.
 * @param second Another study.
 * @returns Negative when `first` comes before `second`, positive after, zero when they tie.
 */
function compareForFetching(first: Study, second: Study): number {
  return (
    compareText(firstAuthorName(first), firstAuthorName(second)) ||
    first.year - second.year ||
    compareText(first.title, second.title)
  );
}

/**
 * The first author's name as it is filed, or empty for a study with no authors (which a saved study never has).
 *
 * @param study A study in the catalogue.
 */
function firstAuthorName(study: Study): string {
  const firstAuthor = study.authors[0];
  return firstAuthor === undefined ? "" : filingName(firstAuthor);
}

/**
 * Compares two texts in comparable form (see `comparableText`), so sorting ignores case and accents.
 *
 * @param first One text.
 * @param second Another text.
 * @returns Negative, zero or positive, as `first` sorts before, with or after `second`.
 */
function compareText(first: string, second: string): number {
  return comparableText(first).localeCompare(comparableText(second));
}

/**
 * Why a file is listed as not matched, in a sentence for the Fetch page. An ambiguous file names the studies it could
 * be, by title, so Matt can see which one to correct.
 *
 * @param file A file the matching could not place.
 */
export function unmatchedFileReason(file: UnmatchedFile): string {
  if (file.kind === "notPaperName")
    return "The name is not in the form (Surname, Year) Short Title.pdf.";
  if (file.kind === "noStudy")
    return "No study has this first author and year.";
  const titles = file.candidates.map((study) => study.title).join("; ");
  return `It could be any of: ${titles}.`;
}
