/**
 * Topic tags: the free-form side of categorizing a study, alongside the fixed facets. Tags form a hierarchy where a
 * tag may have several parents ("Creatine" can sit under both "Supplements" and "Strength"), so filtering by a tag
 * also finds studies tagged with anything beneath it.
 */
import { createId } from "./ids";
import { containsFolded, foldForMatching } from "./textMatching";

export type Tag = {
  id: string;
  name: string;
  /** The tags this one sits under; empty for a top-level topic. */
  parentIds: readonly string[];
  /** Other names that should find this tag, e.g. "muscle growth" for Hypertrophy. */
  aliases: readonly string[];
};

/**
 * A new tag with a fresh id and no aliases.
 *
 * @param name The tag's name, trimmed.
 * @param parentIds The tags it sits under; none makes it a top-level topic.
 */
export function createTag(
  name: string,
  parentIds: readonly string[] = [],
): Tag {
  return { id: createId(), name: name.trim(), parentIds, aliases: [] };
}

/**
 * The tag whose name or one of whose aliases is the given name, ignoring case and surrounding spaces. Used to stop
 * "hypertrophy" being created when "Hypertrophy" exists.
 *
 * @param name The name to look for.
 * @param tags Every tag in the catalogue.
 * @returns The matching tag; undefined when no tag has that name or alias.
 */
export function findTagByName(
  name: string,
  tags: readonly Tag[],
): Tag | undefined {
  const wanted = foldForMatching(name);
  return tags.find((tag) =>
    tagNames(tag).map(foldForMatching).includes(wanted),
  );
}

/**
 * The tags whose name or an alias contains the query, for suggestions as a person types: tags whose name starts
 * with the query first, then the rest, each group in alphabetical order.
 *
 * @param query What has been typed; matched ignoring case and accents.
 * @param tags The tags to choose from.
 */
export function matchingTags(query: string, tags: readonly Tag[]): Tag[] {
  const matches = tags.filter((tag) =>
    tagNames(tag).some((name) => containsFolded(name, query)),
  );
  const startsWithQuery = (tag: Tag) =>
    foldForMatching(tag.name).startsWith(foldForMatching(query));
  const byName = (first: Tag, second: Tag) =>
    first.name.localeCompare(second.name);
  const leading = matches.filter(startsWithQuery).sort(byName);
  const others = matches.filter((tag) => !startsWithQuery(tag)).sort(byName);
  return [...leading, ...others];
}

/**
 * A tag's name with its parents' names in parentheses, so two tags with the same name can be told apart: "Science
 * (Philosophy)", "Creatine (Supplements, Strength)", or just "Nutrition" for a top-level tag.
 *
 * @param tag The tag to name.
 * @param tags Every tag in the catalogue, to look up its parents.
 */
export function tagNameWithParents(tag: Tag, tags: readonly Tag[]): string {
  const parentNames = tag.parentIds
    .map(
      (parentId) => tags.find((candidate) => candidate.id === parentId)?.name,
    )
    .filter((name) => name !== undefined);
  if (parentNames.length === 0) return tag.name;
  return `${tag.name} (${parentNames.join(", ")})`;
}

/**
 * The ids of a tag and of every tag beneath it, at any depth: what a filter on that tag should match.
 *
 * The hierarchy is checked for cycles when parents are set (`wouldCreateCycle`), but imported data could still
 * contain one, so each tag is visited at most once and a cycle cannot loop forever.
 *
 * @param tagId The tag to start from.
 * @param tags Every tag in the catalogue.
 * @returns A set containing `tagId` and all its descendants.
 */
export function descendantIds(
  tagId: string,
  tags: readonly Tag[],
): Set<string> {
  const childrenByParent = childIdsByParentId(tags);
  // Grows as the walk finds new tags; a tag already in it is not visited again, which is what stops a cycle
  const found = new Set<string>([tagId]);
  const waiting = [tagId];
  while (waiting.length > 0) {
    // Non-null: the loop only runs while waiting has an item
    const current = waiting.pop()!;
    const children = childrenByParent.get(current) ?? [];
    const newChildren = children.filter((childId) => !found.has(childId));
    for (const childId of newChildren) {
      found.add(childId);
      waiting.push(childId);
    }
  }
  return found;
}

/**
 * Whether making `parentId` a parent of `tagId` would put a tag beneath itself: true when they are the same tag, or
 * the proposed parent is already one of the tag's descendants.
 *
 * @param tagId The tag gaining a parent.
 * @param parentId The proposed parent.
 * @param tags Every tag in the catalogue.
 */
export function wouldCreateCycle(
  tagId: string,
  parentId: string,
  tags: readonly Tag[],
): boolean {
  return descendantIds(tagId, tags).has(parentId);
}

/** A tag's name followed by its aliases. */
function tagNames(tag: Tag): string[] {
  return [tag.name, ...tag.aliases];
}

/** For each tag that has children, the ids of its direct children. */
function childIdsByParentId(tags: readonly Tag[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const tag of tags) {
    for (const parentId of tag.parentIds) {
      const siblings = children.get(parentId) ?? [];
      siblings.push(tag.id);
      children.set(parentId, siblings);
    }
  }
  return children;
}
