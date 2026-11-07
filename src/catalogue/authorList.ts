/**
 * Author lists as a person pastes them, read into structured authors (family and given names) for the citation
 * styles. Accepted forms, which cover what journals, PubMed and reference lists show:
 *
 *   PubMed:          Schoenfeld BJ, Ogborn D, Krieger JW
 *   Reference list:  Schoenfeld, B. J., Ogborn, D., & Krieger, J. W.
 *   Journal page:    Brad Jon Schoenfeld, Dan Ogborn and James W. Krieger
 *   One per line, or separated by semicolons, each "Family, Given" or any form above
 *
 * Reading is a best guess, so the form shows the result back to the person before they save.
 */
import type { Author } from "./study";

/** Lowercase name particles that belong to the family name: "Ludwig van Beethoven" has family name "van Beethoven". */
const FAMILY_PARTICLES = new Set([
  "van",
  "von",
  "de",
  "der",
  "den",
  "da",
  "di",
  "del",
  "della",
  "du",
  "le",
  "la",
]);

/** Initials written on their own: "B.", "B. J.", "BJ", "J.-P.", "JW". At most four letters, all capitals. */
const INITIALS = /^(?:[A-Z]\.?(?:-[A-Z]\.?)?\s*){1,4}$/;

/** "et al." in any common spelling, which means the list is not complete. */
const ET_AL = /\bet\.?\s*al\b\.?/i;

/**
 * Whether the text cuts the author list short with "et al.", which no citation style can use for a reference list.
 *
 * @param text The author list as typed or pasted.
 */
export function hasEtAl(text: string): boolean {
  return ET_AL.test(text);
}

/**
 * The authors in an author list, in order.
 *
 * @param text The author list as typed or pasted, in any of the forms in this file's header.
 * @returns The authors; empty for blank text. Given names are kept as written (full names or initials).
 */
export function parseAuthorList(text: string): Author[] {
  // A final period ends the list (PubMed's "Krieger JW.") unless it belongs to a lone initial ("Krieger, J. W.")
  const cleaned = text
    .replace(ET_AL, "")
    .trim()
    .replace(/(?<![\s.\-][A-Z])\.$/, "");
  if (cleaned === "") return [];
  const hasOneAuthorPerPart = /[;\n]/.test(cleaned);
  const names = hasOneAuthorPerPart
    ? cleaned.split(/[;\n]/).map(withoutConjunction).map(invertedOrPlainName)
    : commaSeparatedNames(cleaned);
  return names.filter((author) => author.family !== "");
}

/**
 * The authors in the form the edit page shows them, which `parseAuthorList` reads back unchanged:
 * "Schoenfeld, Brad Jon; Ogborn, Dan; Krieger, James W."
 *
 * @param authors The study's authors.
 */
export function formatAuthorList(authors: readonly Author[]): string {
  const names = authors.map((author) =>
    author.given === "" ? author.family : `${author.family}, ${author.given}`,
  );
  return names.join("; ");
}

/**
 * Names separated only by commas, where a comma can also sit between a family name and its initials (the
 * reference-list form). A part that is only initials belongs to the name before it.
 */
function commaSeparatedNames(text: string): Author[] {
  // "A, B and C" and "A, B, & C" separate their last name with a conjunction instead of (or as well as) a comma
  const commasOnly = text.replace(/,?\s+(?:and|&)\s+/gi, ", ");
  const parts = commasOnly
    .split(",")
    .map(withoutConjunction)
    .filter((part) => part !== "");
  const authors: Author[] = [];
  for (const part of parts) {
    // The previous author, if it is still waiting for the initials that follow it in a reference list
    const previous = authors.at(-1);
    const isInitialsOfPrevious =
      INITIALS.test(part) && previous !== undefined && previous.given === "";
    if (isInitialsOfPrevious) {
      previous.given = part;
    } else {
      authors.push(plainName(part));
    }
  }
  return authors;
}

/** One name that may be inverted ("Schoenfeld, Brad Jon") or written in any form `plainName` reads. */
function invertedOrPlainName(text: string): Author {
  const commaIndex = text.indexOf(",");
  if (commaIndex === -1) return plainName(text);
  const family = text.slice(0, commaIndex).trim();
  const given = text.slice(commaIndex + 1).trim();
  return { family, given };
}

/**
 * One name without a comma: "Schoenfeld BJ" (family first, initials last, as PubMed writes it), "Brad Jon
 * Schoenfeld" or "J. W. Krieger" (given names first), or a lone family name.
 */
function plainName(text: string): Author {
  const words = text.trim().split(/\s+/);
  const lastWord = words.at(-1) ?? "";
  const endsWithInitials = words.length > 1 && INITIALS.test(lastWord);
  if (endsWithInitials) {
    return { family: words.slice(0, -1).join(" "), given: lastWord };
  }
  const familyStart = familyNameStart(words);
  return {
    family: words.slice(familyStart).join(" "),
    given: words.slice(0, familyStart).join(" "),
  };
}

/** Where the family name starts in a given-names-first name: the last word, plus any particles just before it. */
function familyNameStart(words: readonly string[]): number {
  let start = words.length - 1;
  while (start > 1 && FAMILY_PARTICLES.has(words[start - 1] ?? "")) start--;
  return start;
}

/** The part without a leading "and" or "&", which often introduces the last author. */
function withoutConjunction(part: string): string {
  return part.trim().replace(/^(?:and|&)\s+/i, "");
}
