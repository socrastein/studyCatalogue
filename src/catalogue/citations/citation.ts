/**
 * The shared shape of a formatted citation, and how one is put together. A formatter (apa.ts, mla.ts, redditLink.ts)
 * describes a citation as a list of segments, some italic; `renderCitation` turns that into plain text, for pasting
 * into Reddit or anywhere that ignores formatting, and HTML, which keeps the italics when pasted into Word or Google
 * Docs.
 */
import { doiUrl } from "../doi";
import type { Study } from "../study";

/** One citation in both forms the copy button puts on the clipboard. */
export type Citation = { plainText: string; html: string };

/** A run of citation text, italic or not. */
export type Segment = { text: string; isItalic: boolean };

/**
 * A plain run of citation text.
 *
 * @param text The text, unescaped.
 */
export function plain(text: string): Segment {
  return { text, isItalic: false };
}

/**
 * An italic run of citation text, such as a journal name.
 *
 * @param text The text, unescaped.
 */
export function italic(text: string): Segment {
  return { text, isItalic: true };
}

/**
 * The citation as plain text and as HTML, from its segments in order.
 *
 * @param segments The citation's runs of text; empty runs are skipped.
 */
export function renderCitation(segments: Segment[]): Citation {
  const nonEmpty = segments.filter((segment) => segment.text !== "");
  const plainText = nonEmpty.map((segment) => segment.text).join("");
  const html = nonEmpty.map(segmentToHtml).join("");
  return { plainText, html };
}

/** One segment as escaped HTML, wrapped in <i> when italic. */
function segmentToHtml(segment: Segment): string {
  const escaped = escapeHtml(segment.text);
  return segment.isItalic ? `<i>${escaped}</i>` : escaped;
}

/**
 * Text made safe to place in HTML: the characters HTML treats as markup become entities.
 *
 * @param text Any text, e.g. a title containing "<" or "&".
 */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Where a citation links to: the DOI's link when there is one, because it never breaks, otherwise the URL.
 *
 * @param study The study being cited.
 * @returns The link; null when the study has neither a DOI nor a URL.
 */
export function studyLink(study: Study): string | null {
  return study.doi === null ? study.url : doiUrl(study.doi);
}

/**
 * The text followed by a period, unless it already ends in sentence-ending punctuation: "Does it work?" stays as it
 * is rather than becoming "Does it work?.".
 */
export function withClosingPeriod(text: string): string {
  return /[.?!]$/.test(text) ? text : `${text}.`;
}
