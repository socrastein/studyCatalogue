/**
 * Tests for deciding what the New Tag box will do with a typed name.
 */
import { describe, expect, it } from "vitest";
import { newTagRequest } from "./newTagRequest";
import type { Tag } from "./tags";

const hypertrophy: Tag = {
  id: "t1",
  name: "Hypertrophy",
  aliases: ["muscle growth"],
  parentIds: [],
};
const tags = [hypertrophy];

describe("newTagRequest", () => {
  it("is blank for nothing, or only spaces", () => {
    expect(newTagRequest("", tags, [])).toEqual({ kind: "blank" });
    expect(newTagRequest("   ", tags, [])).toEqual({ kind: "blank" });
  });

  it("creates a new tag for a name nothing has, trimmed", () => {
    expect(newTagRequest("  Rest intervals ", tags, [])).toEqual({
      kind: "createsNewTag",
      tagName: "Rest intervals",
    });
  });

  it("adds the existing tag when its name matches ignoring case and it is not chosen", () => {
    expect(newTagRequest("hypertrophy", tags, [])).toEqual({
      kind: "addsExistingTag",
      tagName: "Hypertrophy",
    });
  });

  it("finds an existing tag by alias and reports the tag's own name", () => {
    expect(newTagRequest("Muscle Growth", tags, ["other"])).toEqual({
      kind: "addsExistingTag",
      tagName: "Hypertrophy",
    });
  });

  it("says a tag is already chosen, by name or by alias", () => {
    expect(newTagRequest("Hypertrophy", tags, ["t1"])).toEqual({
      kind: "alreadyChosen",
      tagName: "Hypertrophy",
    });
    expect(newTagRequest("muscle growth", tags, ["t1"])).toEqual({
      kind: "alreadyChosen",
      tagName: "Hypertrophy",
    });
  });
});
