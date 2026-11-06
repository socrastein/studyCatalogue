/**
 * Tests for the tag manager's changes: editing a tag (names that clash, loops), merging duplicates, deleting a tag
 * while keeping the hierarchy, and counting a tag's studies.
 */
import { describe, expect, it } from "vitest";
import type { Catalogue } from "./catalogue";
import { createStudy, type Study } from "./study";
import {
  deleteTag,
  editTag,
  mergeTags,
  studyCountForTag,
  type TagEditResult,
} from "./tagEdits";
import type { Tag } from "./tags";
import { exampleStudyDetails } from "./testFixtures";

/** A tag with a readable fixed id that is also its name. */
function tag(
  id: string,
  parentIds: string[] = [],
  aliases: string[] = [],
): Tag {
  return { id, name: id, parentIds, aliases };
}

/** A study with the given tags. */
function studyTagged(tagIds: string[]): Study {
  return createStudy(exampleStudyDetails({ tagIds }));
}

// strength
// └── hypertrophy
//     └── volume
// muscle growth (a duplicate of hypertrophy, with alias "size")
function exampleCatalogue(): Catalogue {
  return {
    tags: [
      tag("strength"),
      tag("hypertrophy", ["strength"]),
      tag("volume", ["hypertrophy"]),
      tag("muscle growth", [], ["size"]),
    ],
    studies: [
      studyTagged(["muscle growth"]),
      studyTagged(["hypertrophy", "muscle growth"]),
      studyTagged(["volume"]),
    ],
  };
}

/** The catalogue from a successful edit; fails the test if the edit was refused. */
function catalogueAfter(result: TagEditResult): Catalogue {
  if (result.kind === "refused") throw new Error(`refused: ${result.problem}`);
  return result.catalogue;
}

/** The problem from a refused edit; fails the test if it succeeded. */
function problemOf(result: TagEditResult): string {
  if (result.kind === "done")
    throw new Error("expected the edit to be refused");
  return result.problem;
}

/** One tag from a catalogue by id; fails the test if it is missing. */
function tagIn(catalogue: Catalogue, tagId: string): Tag {
  const found = catalogue.tags.find((candidate) => candidate.id === tagId);
  if (!found) throw new Error(`no tag ${tagId}`);
  return found;
}

describe("editTag", () => {
  const unchanged = { name: "volume", aliases: [], parentIds: ["hypertrophy"] };

  it("renames, sets aliases and parents together, trimming and dropping blank or duplicate aliases", () => {
    const changes = {
      name: " Training volume ",
      aliases: ["sets", " ", "sets", "training VOLUME"],
      parentIds: [],
    };
    const edited = tagIn(
      catalogueAfter(editTag(exampleCatalogue(), "volume", changes)),
      "volume",
    );
    expect(edited).toEqual({
      id: "volume",
      name: "Training volume",
      aliases: ["sets"],
      parentIds: [],
    });
  });

  it("refuses an empty name", () => {
    expect(
      problemOf(
        editTag(exampleCatalogue(), "volume", { ...unchanged, name: " " }),
      ),
    ).toBe("Enter a name for the tag.");
  });

  it("refuses a name or alias that another tag has, ignoring case", () => {
    const byName = editTag(exampleCatalogue(), "volume", {
      ...unchanged,
      name: "Strength",
    });
    const byAlias = editTag(exampleCatalogue(), "volume", {
      ...unchanged,
      aliases: ["SIZE"],
    });
    expect(problemOf(byName)).toBe('Another tag is already called "Strength".');
    expect(problemOf(byAlias)).toBe('Another tag is already called "SIZE".');
  });

  it("allows keeping the tag's own name", () => {
    expect(editTag(exampleCatalogue(), "volume", unchanged).kind).toBe("done");
  });

  it("refuses a parent that is beneath the tag", () => {
    const changes = { name: "strength", aliases: [], parentIds: ["volume"] };
    expect(
      problemOf(editTag(exampleCatalogue(), "strength", changes)),
    ).toContain("cannot sit beneath itself");
  });

  it("leaves the original catalogue unchanged", () => {
    const catalogue = exampleCatalogue();
    editTag(catalogue, "volume", { ...unchanged, name: "Sets" });
    expect(tagIn(catalogue, "volume").name).toBe("volume");
  });
});

describe("mergeTags", () => {
  it("moves studies to the kept tag without tagging any study twice", () => {
    const merged = catalogueAfter(
      mergeTags(exampleCatalogue(), "muscle growth", "hypertrophy"),
    );
    expect(merged.studies.map((study) => study.tagIds)).toEqual([
      ["hypertrophy"],
      ["hypertrophy"],
      ["volume"],
    ]);
  });

  it("keeps the merged tag's name and aliases as aliases of the kept tag, and removes it", () => {
    const merged = catalogueAfter(
      mergeTags(exampleCatalogue(), "muscle growth", "hypertrophy"),
    );
    expect(tagIn(merged, "hypertrophy").aliases).toEqual([
      "muscle growth",
      "size",
    ]);
    expect(merged.tags.map((candidate) => candidate.id)).not.toContain(
      "muscle growth",
    );
  });

  it("moves the merged tag's subtopics beneath the kept tag", () => {
    const merged = catalogueAfter(
      mergeTags(exampleCatalogue(), "hypertrophy", "muscle growth"),
    );
    expect(tagIn(merged, "volume").parentIds).toEqual(["muscle growth"]);
  });

  it("does not create a loop when the kept tag was beneath the merged one", () => {
    const merged = catalogueAfter(
      mergeTags(exampleCatalogue(), "hypertrophy", "volume"),
    );
    expect(tagIn(merged, "volume").parentIds).toEqual([]);
  });

  it("does not create a loop when a subtopic of the merged tag is above the kept tag", () => {
    // a ─ b ─ c, and c is also directly under a: merging a into c must not put b under c, since b is above c
    const catalogue: Catalogue = {
      tags: [tag("a"), tag("b", ["a"]), tag("c", ["b", "a"])],
      studies: [],
    };
    const merged = catalogueAfter(mergeTags(catalogue, "a", "c"));
    expect(tagIn(merged, "b").parentIds).toEqual([]);
    expect(tagIn(merged, "c").parentIds).toEqual(["b"]);
  });

  it("refuses to merge a tag into itself", () => {
    expect(problemOf(mergeTags(exampleCatalogue(), "volume", "volume"))).toBe(
      "Choose a different tag to merge into.",
    );
  });
});

describe("deleteTag", () => {
  it("removes the tag from every study", () => {
    const after = deleteTag(exampleCatalogue(), "muscle growth");
    expect(after.studies.map((study) => study.tagIds)).toEqual([
      [],
      ["hypertrophy"],
      ["volume"],
    ]);
  });

  it("moves its subtopics up beneath its own parents", () => {
    const after = deleteTag(exampleCatalogue(), "hypertrophy");
    expect(tagIn(after, "volume").parentIds).toEqual(["strength"]);
  });
});

describe("studyCountForTag", () => {
  it("counts studies tagged with the tag itself, not tags beneath it", () => {
    const catalogue = exampleCatalogue();
    expect(studyCountForTag(catalogue.studies, "hypertrophy")).toBe(1);
    expect(studyCountForTag(catalogue.studies, "strength")).toBe(0);
  });
});
