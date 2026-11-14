/**
 * The confirmations Settings shows after it starts a file download. A page cannot know whether the browser allowed
 * the download, so each says what the app did (started it, under this name) and not that the file arrived.
 */

/**
 * @param fileName The backup file's name, e.g. "study-catalogue-2026-11-14.json".
 * @returns e.g. 'Started the download of the backup "study-catalogue-2026-11-14.json".'
 */
export function backupDownloadMessage(fileName: string): string {
  return `Started the download of the backup "${fileName}".`;
}

/**
 * @param fileName The export file's name.
 * @param studyCount How many studies the file holds (all of them: unapproved summaries are left out, not the study).
 * @param approvedSummaryCount How many of those studies carry an approved summary.
 * @returns e.g. 'Exported 129 studies (19 with summaries) to "study-catalogue-website-2026-11-14.json".'
 */
export function websiteExportMessage(
  fileName: string,
  studyCount: number,
  approvedSummaryCount: number,
): string {
  const studies = `${studyCount} ${studyCount === 1 ? "study" : "studies"}`;
  const summaries =
    approvedSummaryCount === 1
      ? "1 with a summary"
      : `${approvedSummaryCount} with summaries`;
  return `Exported ${studies} (${summaries}) to "${fileName}".`;
}

/**
 * @param fileName The file's name.
 * @returns e.g. 'Started the download of the unreadable data as "study-catalogue-unreadable.txt".'
 */
export function unreadableDownloadMessage(fileName: string): string {
  return `Started the download of the unreadable data as "${fileName}".`;
}
