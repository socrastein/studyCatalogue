/**
 * The "MD+" citation: the Reddit markdown link (markdownLink.ts) with the study's current summary below it, to paste
 * into a comment. First written by gpt-oss-20b as a one-shot contained task (2026-11-17).
 */
import type { Study } from "../study";
import { escapeHtml, type Citation } from "./citation";
import { formatMarkdownLink } from "./markdownLink";

/**
 * The markdown link, an empty line, then "Summary:" and the summary in italics. Never in quote marks: the summary is
 * Matt's, not the paper's words, and a quote would pass it off as the paper's. A draft summary counts the same as an
 * approved one: Matt wants whatever the study's summary is now.
 *
 * @param study The study to cite.
 * @returns plainText is the markdown to paste; html is the same as an anchor and the summary in <em>. Null when the study
 *   has no summary text, so the button is disabled.
 */
export function formatMarkdownWithSummary(study: Study): Citation | null {
  const summaryText = study.summary?.text.trim() ?? "";
  if (summaryText === "") return null;
  const link = formatMarkdownLink(study);
  return {
    plainText: `${link.plainText}\n\nSummary: *${summaryText}*`,
    html: `${link.html}<br><br>Summary: <em>${escapeHtml(summaryText)}</em>`,
  };
}
