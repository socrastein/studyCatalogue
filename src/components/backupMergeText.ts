/**
 * The words Settings uses about adding a backup to the catalogue: the confirmation's detail before it, and the
 * notice after it. The counts come from `mergeBackup` (catalogue/backupMerge.ts).
 */
import type { BackupMergeSummary } from "../catalogue/backupMerge";

/**
 * Whether adding the backup would change anything.
 *
 * @param summary What the merge would do.
 */
export function changesAnything(summary: BackupMergeSummary): boolean {
  const changes =
    summary.addedStudies + summary.updatedStudies + summary.addedTags;
  return changes > 0;
}

/**
 * What adding the backup will do, for the confirmation, e.g. "It adds 5 new studies and 3 new tags, and updates 2
 * studies with the backup's newer edits. 4 studies already here stay as they are. Nothing is deleted."
 *
 * @param summary What the merge would do; it changes something (see `changesAnything`).
 */
export function mergeConfirmationDetail(summary: BackupMergeSummary): string {
  const additions = [
    countOf(summary.addedStudies, "new study", "new studies"),
    countOf(summary.addedTags, "new tag", "new tags"),
  ]
    .filter((part) => part !== "")
    .join(" and ");
  const updated = countOf(summary.updatedStudies, "study", "studies");
  const clauses = [
    additions === "" ? "" : `adds ${additions}`,
    updated === "" ? "" : `updates ${updated} with the backup's newer edits`,
  ].filter((clause) => clause !== "");
  const kept = countOf(summary.unchangedStudies, "study", "studies");
  const keptSentence =
    kept === "" ? "" : ` ${kept} already here stay as they are.`;
  return `It ${clauses.join(", and ")}.${keptSentence} Nothing is deleted.`;
}

/**
 * The notice on the next page, e.g. 'Added the backup "catalogue.json": 5 new studies, 3 new tags, 2 studies
 * updated.', or that it held nothing new.
 *
 * @param fileName The backup file's name.
 * @param summary What the merge did.
 */
export function mergeNotice(
  fileName: string,
  summary: BackupMergeSummary,
): string {
  if (!changesAnything(summary))
    return `Nothing new in "${fileName}": everything in it is already here.`;
  const parts = [
    countOf(summary.addedStudies, "new study", "new studies"),
    countOf(summary.addedTags, "new tag", "new tags"),
    countOf(summary.updatedStudies, "study updated", "studies updated"),
  ].filter((part) => part !== "");
  return `Added the backup "${fileName}": ${parts.join(", ")}.`;
}

/** "1 new study", "3 new studies", or "" for none, so a zero count drops out of a list. */
function countOf(count: number, singular: string, plural: string): string {
  if (count === 0) return "";
  return `${count} ${count === 1 ? singular : plural}`;
}
