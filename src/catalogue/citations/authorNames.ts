/**
 * Author names as citation styles write them. Given names are stored as entered (full names or initials, see
 * study.ts), so the styles that want initials derive them here. An organization is always written whole.
 */
import type { Author } from "../study";

/** Two or three capital letters with no spaces or periods, e.g. "BJ": how PubMed writes initials. */
const PACKED_INITIALS = /^[A-Z]{2,3}$/;

/**
 * A person's given names as initials, the way APA writes them: "Brad Jon" gives "B. J.", "Jean-Paul" gives "J.-P.",
 * and initials already entered as "B. J." or PubMed-style "BJ" give "B. J.".
 *
 * @param given The given names as stored.
 * @returns The initials, each followed by a period; empty when no given name was entered.
 */
export function givenInitials(given: string): string {
  const names = given.split(/[\s.]+/).filter((name) => name !== "");
  return names.flatMap(initialsOfName).join(" ");
}

/** The initials of one given name: one for an ordinary name, one per hyphenated part, one per letter of "BJ". */
function initialsOfName(name: string): string[] {
  if (PACKED_INITIALS.test(name)) {
    return Array.from(name, (letter) => `${letter}.`);
  }
  const hyphenatedParts = name.split("-");
  const joined = hyphenatedParts.map((part) => `${part.charAt(0)}.`).join("-");
  return [joined];
}

/**
 * The name an author is filed and cited under: a person's family name, an organization's full name. Reference lists
 * and short mentions lead with it.
 *
 * @param author One author.
 */
export function filingName(author: Author): string {
  return author.kind === "person" ? author.family : author.name;
}

/**
 * The name as it reads in a sentence: "Brad Jon Schoenfeld", "Schoenfeld" when no given name was entered, or the
 * organization's name.
 *
 * @param author One author.
 */
export function fullName(author: Author): string {
  if (author.kind === "organization") return author.name;
  return author.given === ""
    ? author.family
    : `${author.given} ${author.family}`;
}

/**
 * One author as APA's reference list writes it: "Schoenfeld, B. J.", "Schoenfeld" when no given name was entered, or
 * the organization's name.
 *
 * @param author One author.
 */
export function apaAuthorName(author: Author): string {
  if (author.kind === "organization") return author.name;
  const initials = givenInitials(author.given);
  return initials === "" ? author.family : `${author.family}, ${initials}`;
}

/**
 * The name used in short, in-text style mentions: "Schoenfeld", or "Schoenfeld & Ogborn", or "Schoenfeld et al.";
 * an organization by its full name ("World Health Organization et al.").
 *
 * @param authors The study's authors, in order; never empty in a saved study.
 */
export function shortAuthorMention(authors: readonly Author[]): string {
  const filingNames = authors.map(filingName);
  if (filingNames.length <= 2) return filingNames.join(" & ");
  return `${filingNames[0]} et al.`;
}
