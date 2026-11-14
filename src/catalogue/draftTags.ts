/**
 * Keeping an open study form's chosen tags valid when the catalogue's tags change under it (another device's changes
 * merged in or adopted): a chosen tag that no longer exists is replaced by the surviving tag of the same name, or
 * dropped. Plain functions with no Vue, so they are tested in Node; StudyForm.vue is their user.
 */
import { foldForMatching } from "./textMatching";
import type { Tag } from "./tags";

/** What a draft's tag ids became after the catalogue's tags changed. */
export type ReconciledTagIds = {
  /** The chosen tags that exist now, in their original order, each once. */
  tagIds: string[];
  /** The names of the chosen tags that were dropped because nothing took their place; empty when none were. */
  droppedTagNames: string[];
};

/** What a dropped tag is called when the tags before the change did not hold it either, so its name is unknown. */
const UNKNOWN_TAG_NAME = "Unknown tag";

/**
 * Makes a draft's chosen tag ids valid for the catalogue's tags as they are now. Two devices that each create a tag
 * with the same name end up with one tag after a merge, under one of the two ids; the draft that held the other id
 * moves to the survivor (matching names ignoring case and accents, as the merge does). A tag deleted on another
 * device has no survivor, so it is dropped and named, for the form to say so.
 *
 * @param draftTagIds The ids the draft holds.
 * @param previousTags The tags before the change, which say what a vanished id was called.
 * @param currentTags The tags now.
 */
export function reconcileDraftTagIds(
  draftTagIds: readonly string[],
  previousTags: readonly Tag[],
  currentTags: readonly Tag[],
): ReconciledTagIds {
  const tagIds: string[] = [];
  const droppedTagNames: string[] = [];
  for (const tagId of draftTagIds) {
    const survivorId = survivingTagId(tagId, previousTags, currentTags);
    if (survivorId === undefined) {
      droppedTagNames.push(nameOfVanishedTag(tagId, previousTags));
    } else if (!tagIds.includes(survivorId)) {
      tagIds.push(survivorId);
    }
  }
  return { tagIds, droppedTagNames };
}

/** The id the tag has now: its own when it still exists, else the current tag with its name; undefined when neither. */
function survivingTagId(
  tagId: string,
  previousTags: readonly Tag[],
  currentTags: readonly Tag[],
): string | undefined {
  if (currentTags.some((tag) => tag.id === tagId)) return tagId;
  const vanishedName = previousTags.find((tag) => tag.id === tagId)?.name;
  if (vanishedName === undefined) return undefined;
  const wanted = foldForMatching(vanishedName);
  return currentTags.find((tag) => foldForMatching(tag.name) === wanted)?.id;
}

/** The name a vanished tag had before the change, or a stand-in when the earlier tags do not hold it. */
function nameOfVanishedTag(
  tagId: string,
  previousTags: readonly Tag[],
): string {
  return previousTags.find((tag) => tag.id === tagId)?.name ?? UNKNOWN_TAG_NAME;
}

/**
 * The sentence telling the person which chosen tags were taken off the study.
 *
 * @param droppedTagNames The names of the dropped tags; at least one.
 * @returns e.g. 'Removed "Sleep" from this study because that tag no longer exists.'
 */
export function droppedTagsMessage(droppedTagNames: readonly string[]): string {
  const quoted = droppedTagNames.map((name) => `"${name}"`);
  const isOne = quoted.length === 1;
  const names = isOne
    ? quoted.join("")
    : `${quoted.slice(0, -1).join(", ")} and ${quoted.at(-1)}`;
  return `Removed ${names} from this study because ${isOne ? "that tag no longer exists" : "those tags no longer exist"}.`;
}
