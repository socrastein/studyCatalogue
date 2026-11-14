/**
 * Tests for keeping a study draft's tags valid when the catalogue's tags change under the open form.
 */
import { describe, expect, it } from "vitest";
import { droppedTagsMessage, reconcileDraftTagIds } from "./draftTags";
import type { Tag } from "./tags";

/** A top-level tag whose id is given. */
function tag(id: string, name: string): Tag {
  return { id, name, aliases: [], parentIds: [] };
}

describe("reconcileDraftTagIds", () => {
  it("leaves ids alone when every tag still exists", () => {
    const tags = [tag("a", "Sleep"), tag("b", "Protein")];
    expect(reconcileDraftTagIds(["b", "a"], tags, tags)).toEqual({
      tagIds: ["b", "a"],
      droppedTagNames: [],
    });
  });

  it("moves a vanished tag to the surviving tag with the same name, keeping the order", () => {
    // Two devices each made "Sleep"; the merge kept the other device's id
    const before = [tag("mine", "Sleep"), tag("p", "Protein")];
    const after = [tag("theirs", "Sleep"), tag("p", "Protein")];
    expect(reconcileDraftTagIds(["mine", "p"], before, after)).toEqual({
      tagIds: ["theirs", "p"],
      droppedTagNames: [],
    });
  });

  it("matches the name ignoring case and accents, as the merge does", () => {
    const before = [tag("mine", "Récovery")];
    const after = [tag("theirs", "recovery")];
    expect(reconcileDraftTagIds(["mine"], before, after).tagIds).toEqual([
      "theirs",
    ]);
  });

  it("drops a tag nothing took the place of, and names it", () => {
    const before = [tag("a", "Sleep"), tag("b", "Protein")];
    const after = [tag("b", "Protein")];
    expect(reconcileDraftTagIds(["a", "b"], before, after)).toEqual({
      tagIds: ["b"],
      droppedTagNames: ["Sleep"],
    });
  });

  it("does not hold the same tag twice when the draft had both the vanished tag and its survivor", () => {
    const before = [tag("mine", "Sleep"), tag("theirs", "Sleep")];
    const after = [tag("theirs", "Sleep")];
    expect(
      reconcileDraftTagIds(["mine", "theirs"], before, after).tagIds,
    ).toEqual(["theirs"]);
  });

  it("drops an id the earlier tags never held, under a stand-in name", () => {
    expect(reconcileDraftTagIds(["ghost"], [], [tag("a", "Sleep")])).toEqual({
      tagIds: [],
      droppedTagNames: ["Unknown tag"],
    });
  });
});

describe("droppedTagsMessage", () => {
  it("says that one tag no longer exists", () => {
    expect(droppedTagsMessage(["Sleep"])).toBe(
      'Removed "Sleep" from this study because that tag no longer exists.',
    );
  });

  it("lists several tags", () => {
    expect(droppedTagsMessage(["Sleep", "Protein", "Zinc"])).toBe(
      'Removed "Sleep", "Protein" and "Zinc" from this study because those tags no longer exist.',
    );
  });
});
