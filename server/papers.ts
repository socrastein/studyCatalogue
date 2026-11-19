/**
 * The home server's scan of Matt's papers folder: the names of the PDFs under it, at any depth, for the Fetch page
 * (src/catalogue/paperMatching.ts decides which study each one belongs to). Names only: the scan never opens a PDF and
 * never sends a path, because the names are all the app needs and a folder listing is no business of the browser's.
 *
 * A folder that cannot be read (the drive not mounted, a permission) is an error, never an empty list: an empty list
 * would tell Matt that he has no papers at all. The error travels as a value so the request handler can answer it.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/** What the scan found: the PDF names in order, or the reason the folder could not be read. */
export type PapersListing =
  | { kind: "listed"; fileNames: string[] }
  | { kind: "unreadable"; folder: string; reason: string };

/**
 * The names of every PDF under a folder, sorted, with no paths. Names are matched without regard to case, so
 * "Watson.PDF" counts.
 *
 * @param folder The papers folder, e.g. "/mnt/Sata500GB/Studies".
 * @returns The names, or `unreadable` with the system's message when any folder in the tree cannot be read. A partly
 * read tree is never returned as a list: one hidden folder would make papers look missing.
 */
export async function listPaperFileNames(
  folder: string,
): Promise<PapersListing> {
  try {
    const fileNames = await pdfNamesUnder(folder);
    return { kind: "listed", fileNames: fileNames.sort() };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { kind: "unreadable", folder, reason };
  }
}

/**
 * The PDF names in a folder and in every folder below it. A read error in any of them rejects the whole scan, which
 * `listPaperFileNames` turns into `unreadable`.
 *
 * @param folder A folder to list.
 */
async function pdfNamesUnder(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  const names: string[] = [];
  // One folder at a time: the scan runs once per visit to the Fetch page, so simple beats fast here
  for (const entry of entries) {
    if (entry.isDirectory()) {
      names.push(...(await pdfNamesUnder(join(folder, entry.name))));
    } else if (entry.isFile() && isPdfName(entry.name)) {
      names.push(entry.name);
    }
  }
  return names;
}

/**
 * Whether a file name ends in ".pdf", in any case.
 *
 * @param name A file name, without its folder.
 */
function isPdfName(name: string): boolean {
  return name.toLowerCase().endsWith(".pdf");
}
