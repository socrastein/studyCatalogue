/**
 * Tests for tags: finding by name or alias, and walking the hierarchy (descendants, cycles).
 */
import { describe, expect, it } from "vitest";
import {
  createTag,
  descendantIds,
  findTagByName,
  wouldCreateCycle,
  type Tag,
} from "./tags";

/** A tag with a readable fixed id, for building small hierarchies. */
function tag(
  id: string,
  parentIds: string[] = [],
  aliases: string[] = [],
): Tag {
  return { id, name: id, parentIds, aliases };
}

// nutrition
// ├── supplements
// │   └── creatine
// └── protein
// strength
// └── creatine (a second parent)
const HIERARCHY = [
  tag("nutrition"),
  tag("supplements", ["nutrition"]),
  tag("protein", ["nutrition"]),
  tag("strength"),
  tag("creatine", ["supplements", "strength"]),
];

describe("createTag", () => {
  it("trims the name and starts with no aliases", () => {
    const created = createTag("  Creatine ", ["supplements"]);
    expect(created).toMatchObject({
      name: "Creatine",
      parentIds: ["supplements"],
      aliases: [],
    });
  });

  it("makes a top-level tag when no parents are given", () => {
    expect(createTag("Sleep").parentIds).toEqual([]);
  });
});

describe("findTagByName", () => {
  const tags = [tag("Hypertrophy", [], ["muscle growth"])];

  it("matches the name ignoring case and surrounding spaces", () => {
    expect(findTagByName("  hypertrophy ", tags)?.id).toBe("Hypertrophy");
  });

  it("matches an alias", () => {
    expect(findTagByName("Muscle Growth", tags)?.id).toBe("Hypertrophy");
  });

  it("is undefined when nothing matches", () => {
    expect(findTagByName("Strength", tags)).toBeUndefined();
  });
});

describe("descendantIds", () => {
  it("includes the tag itself and every tag beneath it, at any depth", () => {
    expect(descendantIds("nutrition", HIERARCHY)).toEqual(
      new Set(["nutrition", "supplements", "protein", "creatine"]),
    );
  });

  it("follows each of a tag's parents, so creatine is under strength too", () => {
    expect(descendantIds("strength", HIERARCHY)).toEqual(
      new Set(["strength", "creatine"]),
    );
  });

  it("is only the tag itself for a tag with no children", () => {
    expect(descendantIds("protein", HIERARCHY)).toEqual(new Set(["protein"]));
  });

  it("stops at a cycle in imported data instead of looping forever", () => {
    const cyclic = [tag("a", ["b"]), tag("b", ["a"])];
    expect(descendantIds("a", cyclic)).toEqual(new Set(["a", "b"]));
  });
});

describe("wouldCreateCycle", () => {
  it("is true for making a tag its own parent", () => {
    expect(wouldCreateCycle("protein", "protein", HIERARCHY)).toBe(true);
  });

  it("is true for putting a tag under one of its descendants", () => {
    expect(wouldCreateCycle("nutrition", "creatine", HIERARCHY)).toBe(true);
  });

  it("is false for an unrelated tag", () => {
    expect(wouldCreateCycle("protein", "strength", HIERARCHY)).toBe(false);
  });
});
