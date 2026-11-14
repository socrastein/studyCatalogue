/**
 * Saving text as a file the browser downloads, for backups and for rescuing unreadable saved data.
 */

/**
 * The file name for a backup made on a given day, e.g. "study-catalogue-2026-11-06.json".
 *
 * @param date The day of the backup; today unless a test fixes it.
 */
export function backupFileName(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `study-catalogue-${year}-${month}-${day}.json`;
}

/**
 * The file name for a website export made on a given day, e.g. "study-catalogue-website-2026-11-14.json".
 *
 * @param date The day of the export; today unless a test fixes it.
 */
export function websiteExportFileName(date = new Date()): string {
  return backupFileName(date).replace(
    "study-catalogue-",
    "study-catalogue-website-",
  );
}

/**
 * Makes the browser download the text as a file.
 *
 * @param fileName The name the file is saved under.
 * @param text The file's contents.
 * @param mediaType e.g. "application/json".
 */
export function downloadTextFile(
  fileName: string,
  text: string,
  mediaType: string,
): void {
  const url = URL.createObjectURL(new Blob([text], { type: mediaType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Released after the click has started the download; the file no longer needs the URL
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
