/**
 * Changes to tags that the tag manager makes: renaming, aliases, parents, merging two tags and deleting one. Each
 * takes the catalogue and returns a new one (the input is never changed), or the reason the change was refused, in
 * words for the person.
 *
 * The rules they keep: no two tags share a name or alias (ignoring case and accents), no tag sits beneath itself,
 * and no study or tag points to a tag that no longer exists.
 */
import type { Catalogue } from "./catalogue";
import type { Study } from "./study";
import {
  descendantIds,
  findTagByName,
  wouldCreateCycle,
  type Tag,
} from "./tags";
import { foldForMatching } from "./textMatching";

export type TagEditResult =
  { kind: "done"; catalogue: Catalogue } | { kind: "refused"; problem: string };

/** What a tag's own fields can be changed to in one save. */
export type TagChanges = {
  name: string;
  aliases: readonly string[];
  parentIds: readonly string[];
};

/**
 * Renames a tag and replaces its aliases and parents, all at once (the tag manager saves them together).
 *
 * @param catalogue The catalogue as it is.
 * @param tagId The tag to change.
 * @param changes The new name, aliases and parents; names are trimmed and blank aliases dropped.
 * @returns The changed catalogue, or the problem: an empty name, a name or alias another tag has, or a parent that
 *   would put the tag beneath itself.
 */
export function editTag(
  catalogue: Catalogue,
  tagId: string,
  changes: TagChanges,
): TagEditResult {
  const name = changes.name.trim();
  const cleaned = {
    name,
    aliases: cleanAliases(changes.aliases, name),
    parentIds: [...changes.parentIds],
  };
  const problem = tagChangesProblem(catalogue.tags, tagId, cleaned);
  if (problem !== null) return refused(problem);
  const tags = replaceTag(catalogue.tags, tagId, cleaned);
  return done({ ...catalogue, tags });
}

/**
 * Why cleaned-up tag changes cannot be saved: an empty name, a name or alias another tag has, or a parent that would
 * put the tag beneath itself.
 *
 * @returns The problem for the person; null when the changes are fine.
 */
function tagChangesProblem(
  tags: readonly Tag[],
  tagId: string,
  changes: TagChanges,
): string | null {
  if (changes.name === "") return "Enter a name for the tag.";
  const allNames = [changes.name, ...changes.aliases];
  const clash = firstNameClash(allNames, tagId, tags);
  if (clash) return `Another tag is already called "${clash}".`;
  const isLoop = changes.parentIds.some((parentId) =>
    wouldCreateCycle(tagId, parentId, tags),
  );
  if (isLoop)
    return "A tag cannot sit beneath itself or one of its own subtopics.";
  return null;
}

/**
 * Merges one tag into another, for duplicates such as "Muscle growth" and "Hypertrophy": every study tagged with the
 * merged tag gets the kept one instead, the merged tag's name and aliases become aliases of the kept one (so
 * searches for the old name still find it), its subtopics move beneath the kept one, and the merged tag is removed.
 *
 * @param catalogue The catalogue as it is.
 * @param mergedId The tag that disappears.
 * @param keptId The tag that remains.
 * @returns The changed catalogue, or the problem when the two are the same tag.
 */
export function mergeTags(
  catalogue: Catalogue,
  mergedId: string,
  keptId: string,
): TagEditResult {
  const merged = findTag(catalogue.tags, mergedId);
  if (mergedId === keptId)
    return refused("Choose a different tag to merge into.");
  const kept = { id: keptId, ancestorIds: ancestorIds(catalogue.tags, keptId) };
  const tags = catalogue.tags
    .filter((tag) => tag.id !== mergedId)
    .map((tag) => reparentAfterMerge(tag, merged, kept));
  const studies = catalogue.studies.map((study) =>
    retagStudy(study, mergedId, keptId),
  );
  return done({ studies, tags });
}

/**
 * Deletes a tag: it is removed from every study, and its subtopics move up to sit beneath its own parents (or become
 * top-level when it had none), so the rest of the hierarchy is kept.
 *
 * @param catalogue The catalogue as it is.
 * @param tagId The tag to delete.
 */
export function deleteTag(catalogue: Catalogue, tagId: string): Catalogue {
  const deleted = findTag(catalogue.tags, tagId);
  const tags = catalogue.tags
    .filter((tag) => tag.id !== tagId)
    .map((tag) => replaceParent(tag, tagId, deleted.parentIds));
  const studies = catalogue.studies.map((study) => ({
    ...study,
    tagIds: study.tagIds.filter((id) => id !== tagId),
  }));
  return { studies, tags };
}

/**
 * How many studies are tagged with this tag itself (not counting tags beneath it).
 *
 * @param studies The catalogue's studies.
 * @param tagId The tag to count.
 */
export function studyCountForTag(
  studies: readonly Study[],
  tagId: string,
): number {
  return studies.filter((study) => study.tagIds.includes(tagId)).length;
}

/** The aliases trimmed, without blanks, duplicates, or a copy of the tag's own name. */
function cleanAliases(aliases: readonly string[], name: string): string[] {
  const trimmed = aliases.map((alias) => alias.trim());
  const isOwnName = (alias: string) =>
    foldForMatching(alias) === foldForMatching(name);
  const meaningful = trimmed.filter(
    (alias) => alias !== "" && !isOwnName(alias),
  );
  return [...new Set(meaningful)];
}

/** The first of the names that some other tag already has as its name or an alias; undefined when none clash. */
function firstNameClash(
  names: readonly string[],
  tagId: string,
  tags: readonly Tag[],
): string | undefined {
  const otherTags = tags.filter((tag) => tag.id !== tagId);
  return names.find((name) => findTagByName(name, otherTags) !== undefined);
}

/** The kept tag of a merge, with the tags above it, which must not be moved beneath it. */
type KeptTag = { id: string; ancestorIds: ReadonlySet<string> };

/**
 * After a merge, one remaining tag: the kept tag absorbs the merged tag's name and aliases; a subtopic of the merged
 * tag moves beneath the kept one instead. A subtopic that is already above the kept tag just loses the merged parent,
 * since moving it beneath the kept tag would make a loop.
 */
function reparentAfterMerge(tag: Tag, merged: Tag, kept: KeptTag): Tag {
  if (tag.id === kept.id) {
    const aliases = [
      ...new Set([...tag.aliases, merged.name, ...merged.aliases]),
    ];
    const parentIds = tag.parentIds.filter(
      (parentId) => parentId !== merged.id,
    );
    return { ...tag, aliases, parentIds };
  }
  const newParentIds = kept.ancestorIds.has(tag.id) ? [] : [kept.id];
  return replaceParent(tag, merged.id, newParentIds);
}

/** The ids of every tag above the given one, at any depth. */
function ancestorIds(tags: readonly Tag[], tagId: string): Set<string> {
  const above = tags.filter(
    (tag) => tag.id !== tagId && descendantIds(tag.id, tags).has(tagId),
  );
  return new Set(above.map((tag) => tag.id));
}

/** The tag with one parent swapped for others, without duplicates; unchanged when it is not under that parent. */
function replaceParent(
  tag: Tag,
  oldParentId: string,
  newParentIds: readonly string[],
): Tag {
  if (!tag.parentIds.includes(oldParentId)) return tag;
  const kept = tag.parentIds.filter((parentId) => parentId !== oldParentId);
  return { ...tag, parentIds: [...new Set([...kept, ...newParentIds])] };
}

/** The study with one tag swapped for another, without duplicates; unchanged when it does not have that tag. */
function retagStudy(study: Study, oldTagId: string, newTagId: string): Study {
  if (!study.tagIds.includes(oldTagId)) return study;
  const tagIds = study.tagIds.map((id) => (id === oldTagId ? newTagId : id));
  return { ...study, tagIds: [...new Set(tagIds)] };
}

/** The tags with one tag's own fields replaced. */
function replaceTag(
  tags: readonly Tag[],
  tagId: string,
  fields: Omit<Tag, "id">,
): Tag[] {
  return tags.map((tag) => (tag.id === tagId ? { ...tag, ...fields } : tag));
}

/**
 * The tag with this id. The tag manager only offers tags that exist, so a missing one is a bug, not a person's
 * mistake, and throws.
 */
function findTag(tags: readonly Tag[], tagId: string): Tag {
  const tag = tags.find((candidate) => candidate.id === tagId);
  if (tag === undefined) throw new Error(`No tag has the id "${tagId}"`);
  return tag;
}

/** A successful edit's result. */
function done(catalogue: Catalogue): TagEditResult {
  return { kind: "done", catalogue };
}

/** A refused edit's result, with the reason for the person. */
function refused(problem: string): TagEditResult {
  return { kind: "refused", problem };
}
