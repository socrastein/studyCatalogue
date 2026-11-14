/**
 * Adding a backup to the catalogue instead of replacing it (Settings, "Add a Backup to This Catalogue"), for joining
 * catalogues kept in different browsers. Nothing already in the catalogue is ever removed. The rules, decided with
 * Matt on 2026-11-06:
 *
 * - A study already here (the same id, or the same DOI under another id) keeps whichever version was edited last;
 *   a tie keeps this catalogue's. It keeps this catalogue's id and creation time either way, so its address and
 *   history do not change.
 * - A study's summary travels with the study, so the newer edit's summary wins; a summary is never lost to a copy that
 *   has none (a version 1 backup, say): the older copy's summary fills the gap. A newer unapproved draft that replaces
 *   an approved summary with other words leaves it unapproved; one with the same words keeps the approval.
 * - A backup tag with the same id as one here, or a name or alias matching one here, is the same tag: the backup's
 *   names and parents are added to it, skipping a parent that would make a loop. Any other tag is added as it is.
 *
 * Restoring a backup in place of the catalogue needs none of this: the store replaces the catalogue whole.
 */
import type { Catalogue } from "./catalogue";
import type { Study } from "./study";
import type { StudySummary } from "./summary";
import { findTagByName, wouldCreateCycle, type Tag } from "./tags";

/** What a merge did, for the confirmation before it and the notice after it. */
export type BackupMergeSummary = {
  addedStudies: number;
  /** Studies already here whose backup copy was edited more recently, so it replaced them. */
  updatedStudies: number;
  /** Studies already here whose own version was as recent or more recent, so they were left alone. */
  unchangedStudies: number;
  addedTags: number;
};

/**
 * Whether a merge changed or would change anything in the catalogue.
 *
 * @param summary What the merge did.
 */
export function changesAnything(summary: BackupMergeSummary): boolean {
  const changes =
    summary.addedStudies + summary.updatedStudies + summary.addedTags;
  return changes > 0;
}

export type BackupMergeResult = {
  catalogue: Catalogue;
  summary: BackupMergeSummary;
};

/** Where each backup tag ends up in the merged catalogue: backup tag id to catalogue tag id. */
type TagIdMapping = ReadonlyMap<string, string>;

/**
 * The catalogue with a backup's studies and tags added to it, by the rules in this file's header.
 *
 * @param current The catalogue as it is now.
 * @param backup The backup's catalogue, already read and checked (`parseCatalogue`).
 * @returns The merged catalogue, and counts of what was added, updated and left alone.
 */
export function mergeBackup(
  current: Catalogue,
  backup: Catalogue,
): BackupMergeResult {
  const tagIds = matchBackupTags(current.tags, backup.tags);
  const tags = mergeTags(current.tags, backup.tags, tagIds);
  const studyMerge = mergeStudies(current.studies, backup.studies, tagIds);
  const addedTags = tags.length - current.tags.length;
  return {
    catalogue: { studies: studyMerge.studies, tags },
    summary: { ...studyMerge.counts, addedTags },
  };
}

/** Each backup tag's id in the catalogue: the matching tag's, or its own when it is new. */
function matchBackupTags(
  currentTags: readonly Tag[],
  backupTags: readonly Tag[],
): TagIdMapping {
  const mapping = new Map<string, string>();
  for (const backupTag of backupTags) {
    const sameId = currentTags.find((tag) => tag.id === backupTag.id);
    const sameName = findTagByName(backupTag.name, currentTags);
    const match = sameId ?? sameName;
    mapping.set(backupTag.id, match?.id ?? backupTag.id);
  }
  return mapping;
}

/**
 * The catalogue's tags plus the backup's new ones, with every backup tag's names and parents folded into the tag it
 * maps to. New tags start without parents and gain them in the same pass as the rest, so each parent is checked
 * for loops against the tags as they stand at that point.
 */
function mergeTags(
  currentTags: readonly Tag[],
  backupTags: readonly Tag[],
  tagIds: TagIdMapping,
): Tag[] {
  const isNew = (tag: Tag) => !currentTags.some(({ id }) => id === tag.id);
  const newTags = backupTags.filter(
    (tag) => tagIds.get(tag.id) === tag.id && isNew(tag),
  );
  let tags = [
    ...currentTags,
    ...newTags.map((tag) => ({ ...tag, parentIds: [] })),
  ];
  for (const backupTag of backupTags) {
    tags = foldInBackupTag(tags, backupTag, tagIds);
  }
  return tags;
}

/** The tags with one backup tag's names and parents added to the tag it maps to. */
function foldInBackupTag(
  tags: readonly Tag[],
  backupTag: Tag,
  tagIds: TagIdMapping,
): Tag[] {
  const targetId = tagIds.get(backupTag.id) ?? backupTag.id;
  let merged = tags.map((tag) =>
    tag.id === targetId ? withBackupNames(tag, backupTag) : tag,
  );
  for (const backupParentId of backupTag.parentIds) {
    const parentId = tagIds.get(backupParentId);
    if (parentId === undefined) continue; // a parent the backup itself does not hold
    merged = withParent(merged, targetId, parentId);
  }
  return merged;
}

/**
 * The tag with any of the backup tag's names it does not already answer to added as aliases. A backup name that
 * differs from this tag's (a rename on one machine) becomes an alias, so searching for either still finds it.
 */
function withBackupNames(tag: Tag, backupTag: Tag): Tag {
  const backupNames = [backupTag.name, ...backupTag.aliases];
  const missingNames = backupNames.filter(
    (name) => findTagByName(name, [tag]) === undefined,
  );
  if (missingNames.length === 0) return tag;
  return { ...tag, aliases: [...tag.aliases, ...missingNames] };
}

/** The tags with `parentId` added to the tag's parents, unless it is already there, is the tag, or would make a loop. */
function withParent(
  tags: readonly Tag[],
  tagId: string,
  parentId: string,
): Tag[] {
  const tag = tags.find(({ id }) => id === tagId);
  if (tag === undefined) return [...tags]; // cannot happen: every backup tag maps to a tag in the list
  const isAlreadyParent = tag.parentIds.includes(parentId);
  const isItself = parentId === tagId;
  const makesLoop = wouldCreateCycle(tagId, parentId, tags);
  if (isAlreadyParent || isItself || makesLoop) return [...tags];
  return tags.map((candidate) =>
    candidate.id === tagId
      ? { ...candidate, parentIds: [...candidate.parentIds, parentId] }
      : candidate,
  );
}

type StudyMerge = {
  studies: Study[];
  counts: Omit<BackupMergeSummary, "addedTags">;
};

/** What happened to one backup study (see `placeStudy`). */
type StudyOutcome = "added" | "updated" | "unchanged";

/** The catalogue's studies with each backup study added, or put in place of an older copy of itself. */
function mergeStudies(
  currentStudies: readonly Study[],
  backupStudies: readonly Study[],
  tagIds: TagIdMapping,
): StudyMerge {
  // Built up one backup study at a time, so a later backup study is matched against earlier ones too
  const studies = [...currentStudies];
  const outcomes: StudyOutcome[] = [];
  for (const backupStudy of backupStudies) {
    const incoming = withCatalogueTagIds(backupStudy, tagIds);
    outcomes.push(placeStudy(studies, incoming));
  }
  return { studies, counts: countOutcomes(outcomes) };
}

/**
 * Puts one backup study into `studies`, changing that list in place: added at the end when it is new, put in place
 * of the copy already there when it was edited later, otherwise left out.
 */
function placeStudy(studies: Study[], incoming: Study): StudyOutcome {
  const index = studies.findIndex((study) => isSameStudy(study, incoming));
  const existing = studies[index];
  if (existing === undefined) {
    studies.push(incoming);
    return "added";
  }
  if (isEditedLater(incoming, existing)) {
    studies[index] = keepingIdentity(incoming, existing);
    return "updated";
  }
  if (existing.summary === undefined && incoming.summary !== undefined) {
    // This copy is the newer, but has no summary to lose: the older copy's fills the gap
    studies[index] = { ...existing, summary: incoming.summary };
    return "updated";
  }
  return "unchanged";
}

/** How many studies were added, updated and left unchanged. */
function countOutcomes(
  outcomes: readonly StudyOutcome[],
): StudyMerge["counts"] {
  const count = (outcome: StudyOutcome) =>
    outcomes.filter((candidate) => candidate === outcome).length;
  return {
    addedStudies: count("added"),
    updatedStudies: count("updated"),
    unchangedStudies: count("unchanged"),
  };
}

/** The backup study filed under the catalogue's tags: each tag mapped, a tag the backup lacks dropped, no repeats. */
function withCatalogueTagIds(study: Study, tagIds: TagIdMapping): Study {
  const mapped = study.tagIds.map((tagId) => tagIds.get(tagId));
  const known = mapped.filter((tagId) => tagId !== undefined);
  return { ...study, tagIds: [...new Set(known)] };
}

/** Two copies of one study: the same id, or the same DOI (case does not matter in a DOI). */
function isSameStudy(first: Study, second: Study): boolean {
  if (first.id === second.id) return true;
  if (first.doi === null || second.doi === null) return false;
  return first.doi.toLowerCase() === second.doi.toLowerCase();
}

/** Whether `incoming` was edited after `existing`. ISO 8601 timestamps in UTC sort correctly as text. */
function isEditedLater(incoming: Study, existing: Study): boolean {
  return incoming.updatedAt > existing.updatedAt;
}

/**
 * The newer copy's details under the existing study's id and creation time, so its address does not change, with the
 * summary the two copies' summaries settle on (see `settledSummary`).
 */
function keepingIdentity(newer: Study, existing: Study): Study {
  const { summary: _newerSummary, ...details } = newer;
  const summary = settledSummary(newer.summary, existing.summary);
  return {
    ...details,
    ...(summary === undefined ? {} : { summary }),
    id: existing.id,
    createdAt: existing.createdAt,
  };
}

/**
 * The summary a newer copy of a study ends up with: its own; the older copy's when it has none; and its own words
 * carrying the older copy's approval when the words are the same (an approval is of words, not of a draft's date).
 */
function settledSummary(
  newer: StudySummary | undefined,
  older: StudySummary | undefined,
): StudySummary | undefined {
  if (newer === undefined) return older;
  if (older === undefined || older.text !== newer.text) return newer;
  return { ...newer, approvedAt: older.approvedAt ?? newer.approvedAt };
}
