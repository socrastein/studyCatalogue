/**
 * Tests for which saved versions survive pruning, at the bounds of both rules.
 */
import { describe, expect, it } from "vitest";
import {
  DAILY_SNAPSHOT_DAYS,
  RECENT_SAVES_KEPT,
  versionFileName,
  versionsToDelete,
} from "./versionRetention";

const NOW = new Date("2026-11-14T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** A version name for a save `millisecondsAgo` before NOW, with the revision counted by the caller. */
function savedAgo(millisecondsAgo: number, revision: number): string {
  return versionFileName(new Date(NOW.getTime() - millisecondsAgo), revision);
}

describe("version file names", () => {
  it("sort by time, hold no colons, and end with the revision", () => {
    const name = versionFileName(new Date("2026-11-14T08:30:00.123Z"), 12);
    expect(name).toBe("2026-11-14T08-30-00.123Z-r12.json");
  });
});

describe("the most recent saves", () => {
  it("keeps exactly the newest twenty from one day and deletes the rest of that day", () => {
    // 21 saves minutes apart on one day: all on the same day, so only the daily rule's one survivor (the newest)
    // overlaps the twenty newest
    const names = Array.from({ length: RECENT_SAVES_KEPT + 1 }, (_, index) =>
      savedAgo(index * 60 * 1000, index),
    );
    expect(versionsToDelete(names, NOW)).toEqual([names.at(-1)]);
  });

  it("deletes nothing when there are exactly twenty", () => {
    const names = Array.from({ length: RECENT_SAVES_KEPT }, (_, index) =>
      savedAgo(index * 60 * 1000, index),
    );
    expect(versionsToDelete(names, NOW)).toEqual([]);
  });
});

describe("daily snapshots", () => {
  /** Twenty fresh saves today, which fill the recent-saves allowance, so only the daily rule saves older ones. */
  function twentySavesToday(): string[] {
    return Array.from({ length: RECENT_SAVES_KEPT }, (_, index) =>
      savedAgo(index * 1000, 1000 + index),
    );
  }

  it("keeps only the last save of an earlier day", () => {
    const earlierMorning = savedAgo(2 * DAY + 3 * HOUR, 1);
    const earlierEvening = savedAgo(2 * DAY - 3 * HOUR, 2);
    const names = [...twentySavesToday(), earlierMorning, earlierEvening];
    expect(versionsToDelete(names, NOW)).toEqual([earlierMorning]);
  });

  it("keeps the snapshot of the oldest day in the window and deletes the day before it", () => {
    // NOW is 12:00 on the 14th: 59 days back is 2026-09-16, the 60th day counting today
    const oldestKept = savedAgo((DAILY_SNAPSHOT_DAYS - 1) * DAY, 1);
    const justOutside = savedAgo(DAILY_SNAPSHOT_DAYS * DAY, 2);
    expect(oldestKept.startsWith("2026-09-16")).toBe(true);
    const names = [...twentySavesToday(), oldestKept, justOutside];
    expect(versionsToDelete(names, NOW)).toEqual([justOutside]);
  });

  it("ignores files that are not versions", () => {
    const names = [...twentySavesToday(), "notes.txt", ".catalogue.json.tmp"];
    expect(versionsToDelete(names, NOW)).toEqual([]);
  });
});
