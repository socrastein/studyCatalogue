/**
 * Putting a citation on the clipboard in both forms: HTML, so italics survive a paste into Word or Google Docs, and
 * plain text, which Reddit and plain editors take.
 *
 * The async Clipboard API only exists on secure origins (https and localhost). The app is also opened over plain
 * HTTP from other machines on the LAN, where it is missing, so there the plain text is copied the old way, through
 * a selected hidden textarea and the deprecated `document.execCommand("copy")`.
 */
import type { Citation } from "../catalogue/citations/citation";

/**
 * Copies the citation to the clipboard.
 *
 * @param citation The citation in both forms.
 * @returns true when it was copied (both forms, or plain text only on an insecure origin); false when the browser
 *   refused.
 */
export async function copyCitation(citation: Citation): Promise<boolean> {
  const canWriteRichText = window.isSecureContext && "ClipboardItem" in window;
  if (canWriteRichText) {
    const wasWritten = await writeBothForms(citation);
    if (wasWritten) return true;
  }
  return copyPlainTextBySelection(citation.plainText);
}

/** Writes HTML and plain text through the Clipboard API; false if the browser refuses (e.g. no permission). */
async function writeBothForms(citation: Citation): Promise<boolean> {
  const item = new ClipboardItem({
    "text/plain": new Blob([citation.plainText], { type: "text/plain" }),
    "text/html": new Blob([citation.html], { type: "text/html" }),
  });
  try {
    await navigator.clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}

/** Copies plain text by selecting it in a hidden textarea; works on insecure origins, which have no Clipboard API. */
function copyPlainTextBySelection(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const wasCopied = document.execCommand("copy");
  textarea.remove();
  return wasCopied;
}
