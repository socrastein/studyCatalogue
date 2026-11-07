/**
 * Tests for the words about adding a backup: zero counts drop out, and singular and plural are right.
 */
import { describe, expect, it } from "vitest";
import type { BackupMergeSummary } from "../catalogue/backupMerge";
import {
  changesAnything,
  mergeConfirmationDetail,
  mergeNotice,
} from "./backupMergeText";

/** A summary with everything zero, apart from `counts`. */
function summary(counts: Partial<BackupMergeSummary>): BackupMergeSummary {
  return {
    addedStudies: 0,
    updatedStudies: 0,
    unchangedStudies: 0,
    addedTags: 0,
    ...counts,
  };
}

describe("changesAnything", () => {
  it("is false when every study is already here and no tag is new", () => {
    expect(changesAnything(summary({ unchangedStudies: 4 }))).toBe(false);
  });

  it("is true for a single new tag", () => {
    expect(changesAnything(summary({ addedTags: 1 }))).toBe(true);
  });
});

describe("mergeConfirmationDetail", () => {
  it("says what is added, what is updated and what stays", () => {
    const detail = mergeConfirmationDetail(
      summary({
        addedStudies: 5,
        addedTags: 3,
        updatedStudies: 2,
        unchangedStudies: 4,
      }),
    );
    expect(detail).toBe(
      "It adds 5 new studies and 3 new tags, and updates 2 studies with the backup's newer edits. 4 studies already here stay as they are. Nothing is deleted.",
    );
  });

  it("leaves out what does not happen, and uses the singular for one", () => {
    expect(mergeConfirmationDetail(summary({ addedStudies: 1 }))).toBe(
      "It adds 1 new study. Nothing is deleted.",
    );
    expect(mergeConfirmationDetail(summary({ updatedStudies: 1 }))).toBe(
      "It updates 1 study with the backup's newer edits. Nothing is deleted.",
    );
  });
});

describe("mergeNotice", () => {
  it("lists what changed", () => {
    expect(
      mergeNotice(
        "backup.json",
        summary({ addedStudies: 2, updatedStudies: 1 }),
      ),
    ).toBe('Added the backup "backup.json": 2 new studies, 1 study updated.');
  });

  it("says when the backup held nothing new", () => {
    expect(mergeNotice("backup.json", summary({ unchangedStudies: 3 }))).toBe(
      'Nothing new in "backup.json": everything in it is already here.',
    );
  });
});
