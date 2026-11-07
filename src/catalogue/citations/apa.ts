/**
 * APA 7th edition references for journal articles, e.g.
 *
 *   Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2017). Dose-response relationship between weekly resistance
 *   training volume and increases in muscle mass. *Journal of Sports Sciences*, *35*(11), 1073-1082.
 *   https://doi.org/10.1080/02640414.2016.1210197
 *
 * The title is used as entered. APA wants article titles in sentence case, but converting automatically would wreck
 * proper nouns, acronyms and gene names, so the stored title is trusted instead.
 */
import type { Author, Study } from "../study";
import { apaAuthorName } from "./authorNames";
import {
  italic,
  plain,
  renderCitation,
  studyLink,
  withClosingPeriod,
  type Citation,
  type Segment,
} from "./citation";

/** APA lists up to this many authors in full. */
const MAX_LISTED_AUTHORS = 20;

/** With more than 20 authors, APA lists the first 19, an ellipsis, then the last. */
const AUTHORS_BEFORE_ELLIPSIS = 19;

/**
 * The study's APA 7 reference.
 *
 * @param study The study to cite.
 * @returns The reference as plain text and as HTML with the journal and volume in italics.
 */
export function formatApa(study: Study): Citation {
  const link = studyLink(study);
  return renderCitation([
    // The author element always ends in a period; a person's last initial usually supplies it, an organization's
    // name or a lone family name does not
    plain(
      `${withClosingPeriod(apaAuthorList(study.authors))} (${study.year}). `,
    ),
    plain(withClosingPeriod(study.title)),
    ...apaSource(study),
    plain(link === null ? "" : ` ${link}`),
  ]);
}

/**
 * The authors in APA order: "Family, G. G." each (an organization by its name), commas between, "&" before the last; with more than 20, the first
 * 19, ". . .", then the last (with no "&").
 */
function apaAuthorList(authors: readonly Author[]): string {
  const names = authors.map(apaAuthorName);
  const lastName = names.at(-1) ?? "";
  if (names.length > MAX_LISTED_AUTHORS) {
    const firstNames = names.slice(0, AUTHORS_BEFORE_ELLIPSIS);
    return `${firstNames.join(", ")}, . . . ${lastName}`;
  }
  if (names.length === 1) return lastName;
  const allButLast = names.slice(0, -1);
  return `${allButLast.join(", ")}, & ${lastName}`;
}

/**
 * Where the article was published: " *Journal*, *volume*(issue), pages." Parts the study lacks are left out with
 * their punctuation; an issue without a volume is left out too, since APA attaches the issue to the volume.
 */
function apaSource(study: Study): Segment[] {
  const volumeSegments =
    study.volume === null
      ? []
      : [plain(", "), italic(study.volume), plain(apaIssue(study.issue))];
  const pages = study.pages === null ? "" : `, ${study.pages}`;
  return [
    plain(" "),
    italic(study.journal),
    ...volumeSegments,
    plain(`${pages}.`),
  ];
}

/** The issue in parentheses, e.g. "(11)"; empty when there is none. */
function apaIssue(issue: string | null): string {
  return issue === null ? "" : `(${issue})`;
}
