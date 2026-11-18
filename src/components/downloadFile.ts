/**
 * Saving text as a file the browser downloads, for backups and for rescuing unreadable saved data.
 */

/**
 * The file name for a backup made on a given day, e.g. "study-catalogue-2026-11-06.json".
 *
 * @param date The day of the backup; today unless a test fixes it.
 * @returns The file name, dated by the local calendar day (not UTC), so a backup made at 11pm keeps that day.
 */
export function backupFileName(date = new Date()): string {
  return `study-catalogue-${dayStamp(date)}.json`;
}

/**
 * The file name for a website export made on a given day, e.g. "study-catalogue-website-2026-11-14.json".
 *
 * @param date The day of the export; today unless a test fixes it.
 * @returns The file name, dated like a backup but with "website" in it, so the two cannot be mistaken for each other.
 */
export function websiteExportFileName(date = new Date()): string {
  return `study-catalogue-website-${dayStamp(date)}.json`;
}

/**
 * The local calendar day as YYYY-MM-DD, e.g. "2026-11-06".
 *
 * @param date Any moment; only its local calendar day is used.
 */
function dayStamp(date: Date): string {
  const year = date.getFullYear();
  // getMonth counts from 0 (January is 0), so one is added to read it as a calendar month
  const month = twoDigits(date.getMonth() + 1);
  const day = twoDigits(date.getDate());
  return `${year}-${month}-${day}`;
}

/** A number as two digits with a leading zero below 10, e.g. 3 gives "03" and 11 gives "11". */
function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
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
