/**
 * MLA 9th edition works-cited entries for journal articles, e.g.
 *
 *   Schoenfeld, Brad Jon, et al. "Dose-Response Relationship between Weekly Resistance Training Volume and Increases
 *   in Muscle Mass." *Journal of Sports Sciences*, vol. 35, no. 11, 2017, pp. 1073-1082,
 *   https://doi.org/10.1080/02640414.2016.1210197.
 *
 * Given names are used as entered. The title is used as entered too: MLA wants title case, but converting
 * automatically gets small words, acronyms and names wrong.
 */
import type { Author, Study } from "../study";
import {
  italic,
  plain,
  renderCitation,
  studyLink,
  withClosingPeriod,
  type Citation,
} from "./citation";

/**
 * The study's MLA 9 works-cited entry.
 *
 * @param study The study to cite.
 * @returns The entry as plain text and as HTML with the journal in italics.
 */
export function formatMla(study: Study): Citation {
  const authors = withClosingPeriod(mlaAuthorList(study.authors));
  const title = withClosingPeriod(study.title);
  const containerDetails = mlaContainerDetails(study).join("");
  return renderCitation([
    plain(`${authors} `),
    plain(`"${title}" `),
    italic(study.journal),
    plain(withClosingPeriod(containerDetails)),
  ]);
}

/**
 * The authors as MLA writes them: "Family, Given" for one; "Family, Given, and Given Family" for two; the first
 * author followed by "et al." for three or more.
 */
function mlaAuthorList(authors: Author[]): string {
  const [first, second] = authors;
  if (first === undefined) return "";
  if (authors.length > 2) return `${invertedName(first)}, et al`;
  // No second author: a single-author study
  if (second === undefined) return invertedName(first);
  return `${invertedName(first)}, and ${directName(second)}`;
}

/** "Family, Given", or just "Family" when no given name was entered. */
function invertedName(author: Author): string {
  return author.given === ""
    ? author.family
    : `${author.family}, ${author.given}`;
}

/** "Given Family", or just "Family" when no given name was entered. */
function directName(author: Author): string {
  return author.given === ""
    ? author.family
    : `${author.given} ${author.family}`;
}

/**
 * Everything after the journal name, each part led by its comma: ", vol. 35", ", no. 11", ", 2017", ", pp. 1073-1082"
 * and the link. Parts the study lacks are left out.
 */
function mlaContainerDetails(study: Study): string[] {
  const link = studyLink(study);
  const details = [
    study.volume === null ? null : `vol. ${study.volume}`,
    study.issue === null ? null : `no. ${study.issue}`,
    String(study.year),
    study.pages === null ? null : mlaPages(study.pages),
    link,
  ];
  return details
    .filter((detail) => detail !== null)
    .map((detail) => `, ${detail}`);
}

/** "pp." before a page range, "p." before a single page or article number. */
function mlaPages(pages: string): string {
  const isRange = pages.includes("-");
  return isRange ? `pp. ${pages}` : `p. ${pages}`;
}
