/**
 * What typing a name in the tag picker's New Tag box and pressing Add New Tag will do, decided before anything is
 * changed so the picker can say it truthfully and visibly. Plain functions with no Vue, so they are tested in Node.
 */
import { findTagByName, type Tag } from "./tags";

/** The four things Add New Tag can mean for a typed name. */
export type NewTagRequest =
  | { kind: "blank" }
  | { kind: "alreadyChosen"; tagName: string }
  | { kind: "addsExistingTag"; tagName: string }
  | { kind: "createsNewTag"; tagName: string };

/**
 * Decides what a typed name means. A name matches an existing tag by its name or an alias, ignoring case, as
 * `findOrCreateTag` does, so "hypertrophy" finds "Hypertrophy" instead of creating a second tag.
 *
 * @param typedName What was typed; surrounding spaces are ignored.
 * @param tags Every tag in the catalogue.
 * @param chosenIds The ids of the tags the study already has.
 * @returns blank for nothing typed; alreadyChosen when the matching tag is among the chosen ones; addsExistingTag when
 *   a tag matches but is not chosen yet; createsNewTag when nothing matches. `tagName` is the existing tag's own name
 *   (not what was typed) or the new tag's trimmed name.
 */
export function newTagRequest(
  typedName: string,
  tags: readonly Tag[],
  chosenIds: readonly string[],
): NewTagRequest {
  const name = typedName.trim();
  if (name === "") return { kind: "blank" };
  const existing = findTagByName(name, tags);
  if (existing === undefined) return { kind: "createsNewTag", tagName: name };
  if (chosenIds.includes(existing.id))
    return { kind: "alreadyChosen", tagName: existing.name };
  return { kind: "addsExistingTag", tagName: existing.name };
}
