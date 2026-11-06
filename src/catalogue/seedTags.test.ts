/**
 * Tests for the tags a new catalogue starts with.
 */
import { describe, expect, it } from "vitest";
import { seedTags } from "./seedTags";

describe("seedTags", () => {
  it("makes each subject a top-level tag with an id from its name", () => {
    const nutrition = seedTags().find((tag) => tag.name === "Nutrition");
    expect(nutrition).toEqual({
      id: "nutrition",
      name: "Nutrition",
      parentIds: [],
      aliases: [],
    });
  });

  it("puts each subfield under its subject, with an id from both names", () => {
    const formAndPosture = seedTags().find(
      (tag) => tag.name === "Form & Posture",
    );
    expect(formAndPosture?.id).toBe("exercise-science/form-posture");
    expect(formAndPosture?.parentIds).toEqual(["exercise-science"]);
  });

  it("gives every tag a unique id", () => {
    const ids = seedTags().map((tag) => tag.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns new objects each call, so one catalogue's edits never reach another", () => {
    expect(seedTags()[0]).not.toBe(seedTags()[0]);
  });
});
