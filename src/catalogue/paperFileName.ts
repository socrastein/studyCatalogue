/**
 * Reads the name of a paper file in Matt's papers folder, "(Abu Raya, 2023) Neurobiology of Openness.pdf", into the
 * parts that identify its study: the first author's surname, the year and the short title. Also the text comparison
 * (case and accents ignored) that the surname, title and matching steps share. Pure: no files, no network.
 * paperMatching.ts uses these parts to decide which study a file belongs to.
 */

/** The parts of a paper's file name that identify its study. */
export type PaperFileName = {
  fileName: string;
  /** The first author's surname as written in the name, e.g. "Abu Raya". */
  surname: string;
  year: number;
  /** The title words after the year, e.g. "Neurobiology of Openness". */
  shortTitle: string;
};

/**
 * The fewest letters a title word needs to count when telling studies apart. Four leaves out the short words of
 * English titles ("of", "the", "and", "in"), which most titles share.
 */
const MIN_DISTINGUISHING_LETTERS = 4;

/** The form every paper's file name has: a bracketed surname and year, a space, the short title, then ".pdf". */
const PAPER_FILE_NAME_FORM = /^\((.+), (\d{4})\) (.+)\.pdf$/i;

/**
 * The parts of a paper's file name.
 *
 * @param fileName A file name without its folder, e.g. "(Watson, 2017) LIFTMOR RCT.pdf".
 * @returns The parts; null when the name is not in the form "(Surname, Year) Short Title.pdf".
 */
export function parsePaperFileName(fileName: string): PaperFileName | null {
  const match = PAPER_FILE_NAME_FORM.exec(fileName);
  if (match === null) return null;
  const [, surname = "", year = "", shortTitle = ""] = match;
  return { fileName, surname, year: Number(year), shortTitle };
}

/**
 * Text as the matching compares it: lower case, accents removed (so "Aljinović" and "Aljinovic" are equal), with
 * runs of spaces collapsed.
 *
 * @param text Any text, e.g. a surname or a title.
 * @returns The comparable form. "Aljinović" gives "aljinovic".
 */
export function comparableText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * The words of a title that can tell two studies apart: the comparable words of at least four letters. Shorter words
 * ("of", "the", "rct") are in most titles and say nothing about which study a paper is.
 *
 * @param title A study's title or a paper's short title.
 * @returns The distinct words, each in comparable form.
 */
export function distinguishingWords(title: string): Set<string> {
  const words = comparableText(title).split(/[^\p{L}\p{N}]+/u);
  return new Set(
    words.filter((word) => word.length >= MIN_DISTINGUISHING_LETTERS),
  );
}
