/**
 * What the tag picker's drop-down lists: every tag the person could still add, in the order of the tag tree (see
 * TagTree.vue), each described by its name with its parents so tags that share a name can be told apart. Plain
 * functions with no Vue, so they are tested in Node; TagPicker.vue is their only user.
 */
import { tagNameWithParents, type Tag } from "./tags";

/**
 * One row of the tag picker's drop-down. It has the shape of the library's DropdownOption (a value and a label).
 */
export type TagPickerOption = {
  /** The tag's id, which the drop-down reports when the row is chosen. */
  value: string;
  /**
   * The text the drop-down's search matches: the tag's name with its parents, then its aliases. It is never shown
   * (the picker draws the name with its parents through the option slot), so a search for "muscle growth" finds
   * Hypertrophy without the list showing the alias.
   */
  label: string;
};

/**
 * Every tag in tree order: top-level tags A to Z, each followed by its subtopics (A to Z), and theirs, as far down as it
 * goes. A tag with several parents appears once, beneath the first parent reached. A tag that cannot be reached from
 * the top (imported data with a loop) comes last, so it is still offered.
 *
 * @param tags Every tag in the catalogue.
 * @returns The same tags, each once, in tree order.
 */
export function tagsInTreeOrder(tags: readonly Tag[]): Tag[] {
  const visitedIds = new Set<string>();
  const ordered: Tag[] = [];

  /** Adds a tag, then its subtopics, skipping any tag already added. */
  function visit(tag: Tag): void {
    if (visitedIds.has(tag.id)) return;
    visitedIds.add(tag.id);
    ordered.push(tag);
    for (const child of childrenOf(tag.id, tags)) visit(child);
  }

  const topLevelTags = tags.filter((tag) => tag.parentIds.length === 0);
  for (const tag of sortedByName(topLevelTags)) visit(tag);
  for (const tag of sortedByName(tags)) visit(tag);
  return ordered;
}

/**
 * The drop-down's rows: every tag that is not already chosen, in tree order.
 *
 * @param tags Every tag the picker may offer.
 * @param chosenIds The ids already chosen; they are left out so a tag cannot be added twice.
 * @returns One row per tag still available; empty when every tag is chosen.
 */
export function tagPickerOptions(
  tags: readonly Tag[],
  chosenIds: readonly string[],
): TagPickerOption[] {
  const available = tagsInTreeOrder(tags).filter(
    (tag) => !chosenIds.includes(tag.id),
  );
  return available.map((tag) => ({
    value: tag.id,
    label: [tagNameWithParents(tag, tags), ...tag.aliases].join(" "),
  }));
}

/** The tags that list this id among their parents, A to Z. */
function childrenOf(parentId: string, tags: readonly Tag[]): Tag[] {
  return sortedByName(tags.filter((tag) => tag.parentIds.includes(parentId)));
}

/** A copy of the tags sorted by name, ignoring case where the locale does. */
function sortedByName(tags: readonly Tag[]): Tag[] {
  return [...tags].sort((first, second) =>
    first.name.localeCompare(second.name),
  );
}
