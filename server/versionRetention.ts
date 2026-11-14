/**
 * Which saved versions of the catalogue to keep: the newest saves, plus the last save of each of the recent days, so
 * a mistake noticed a week later can still be undone. Pure; versionFolder.ts does the file work.
 */

/** How many of the most recent saves are always kept. */
export const RECENT_SAVES_KEPT = 20;

/** How many calendar days (UTC, counting today) keep the last save of the day. */
export const DAILY_SNAPSHOT_DAYS = 60;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The name of the version file for a save. Names sort by time, which is how `versionsToDelete` orders them, e.g.
 * "2026-11-14T08-30-00.123Z-r12.json".
 *
 * @param savedAt When the save happened.
 * @param revision The revision the save created.
 */
export function versionFileName(savedAt: Date, revision: number): string {
  // Colons are not allowed in file names on every system, so the time's colons become hyphens
  const stamp = savedAt.toISOString().replaceAll(":", "-");
  return `${stamp}-r${revision}.json`;
}

/**
 * The version files to delete: every one that is neither among the newest `RECENT_SAVES_KEPT` nor the newest of
 * a UTC day within the last `DAILY_SNAPSHOT_DAYS` days. Names that are not version files are never returned.
 *
 * @param fileNames Every name in the versions folder.
 * @param now The current time, which decides which days still count.
 */
export function versionsToDelete(fileNames: string[], now: Date): string[] {
  const versions = fileNames.filter(isVersionFileName).sort().reverse();
  const recent = new Set(versions.slice(0, RECENT_SAVES_KEPT));
  const dailyKept = newestVersionOfEachRecentDay(versions, now);
  return versions.filter((name) => !recent.has(name) && !dailyKept.has(name));
}

/** Whether the name has the shape `versionFileName` makes. */
function isVersionFileName(name: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T[\d-]+\.\d{3}Z-r\d+\.json$/.test(name);
}

/** For each day that is still within the daily window, the newest version saved on it. */
function newestVersionOfEachRecentDay(
  versionsNewestFirst: string[],
  now: Date,
): Set<string> {
  const oldestDay = dayOf(
    new Date(now.getTime() - (DAILY_SNAPSHOT_DAYS - 1) * MILLISECONDS_PER_DAY),
  );
  const kept = new Set<string>();
  const daysSeen = new Set<string>();
  for (const name of versionsNewestFirst) {
    const day = name.slice(0, "YYYY-MM-DD".length);
    const isNewestOfItsDay = !daysSeen.has(day);
    daysSeen.add(day);
    if (isNewestOfItsDay && day >= oldestDay) kept.add(name);
  }
  return kept;
}

/** The UTC calendar day of a time, e.g. "2026-11-14". */
function dayOf(time: Date): string {
  return time.toISOString().slice(0, "YYYY-MM-DD".length);
}
