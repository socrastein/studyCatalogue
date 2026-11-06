/**
 * The short markdown link used when citing a study in a Reddit comment or post, e.g.
 * "[Schoenfeld et al. (2017)](https://doi.org/10.1080/02640414.2016.1210197)".
 */
import type { Study } from "../study";
import { shortAuthorMention } from "./authorNames";
import { escapeHtml, studyLink, type Citation } from "./citation";

/**
 * The study as a markdown link with its short mention as the text. Without a DOI or URL it is the mention alone, as
 * plain text.
 *
 * @param study The study to cite.
 * @returns plainText is the markdown to paste into Reddit; html is the same link as an HTML anchor.
 */
export function formatRedditLink(study: Study): Citation {
  const mention = `${shortAuthorMention(study.authors)} (${study.year})`;
  const link = studyLink(study);
  if (link === null) return { plainText: mention, html: escapeHtml(mention) };
  const linkText = escapeMarkdownLinkText(mention);
  const linkTarget = escapeMarkdownLinkTarget(link);
  return {
    plainText: `[${linkText}](${linkTarget})`,
    html: `<a href="${escapeHtml(link)}">${escapeHtml(mention)}</a>`,
  };
}

/** Link text with square brackets escaped, since they would end the link text early. */
function escapeMarkdownLinkText(text: string): string {
  return text.replace(/[[\]]/g, (bracket) => `\\${bracket}`);
}

/**
 * A link target with parentheses percent-encoded. Many DOIs contain them ("10.1016/S0140-6736(20)30183-5"), and
 * Reddit's markdown would end the link at the first ")".
 */
function escapeMarkdownLinkTarget(link: string): string {
  return link.replaceAll("(", "%28").replaceAll(")", "%29");
}
