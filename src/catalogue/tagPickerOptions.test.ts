import { describe, expect, it } from "vitest";
import type { Tag } from "./tags";
import { tagPickerOptions, tagsInTreeOrder } from "./tagPickerOptions";

function tag(
  id: string,
  parentIds: string[] = [],
  aliases: string[] = [],
): Tag {
  return { id, name: id, parentIds, aliases };
}

describe("tagsInTreeOrder", () => {
  it("lists top-level tags A to Z, each followed by its subtopics", () => {
    const tags = [
      tag("Zinc", ["Nutrition"]),
      tag("Training"),
      tag("Nutrition"),
      tag("Protein", ["Nutrition"]),
      tag("Hypertrophy", ["Training"]),
    ];
    expect(tagsInTreeOrder(tags).map((each) => each.id)).toEqual([
      "Nutrition",
      "Protein",
      "Zinc",
      "Training",
      "Hypertrophy",
    ]);
  });

  it("goes as deep as the hierarchy does", () => {
    const tags = [tag("c", ["b"]), tag("b", ["a"]), tag("a"), tag("d")];
    expect(tagsInTreeOrder(tags).map((each) => each.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("lists a tag with two parents once, under the first parent reached", () => {
    const tags = [
      tag("Strength"),
      tag("Supplements"),
      tag("Creatine", ["Supplements", "Strength"]),
    ];
    expect(tagsInTreeOrder(tags).map((each) => each.id)).toEqual([
      "Strength",
      "Creatine",
      "Supplements",
    ]);
  });

  it("still offers tags that a loop in imported data cuts off from the top", () => {
    const tags = [tag("a", ["b"]), tag("b", ["a"]), tag("top")];
    expect(tagsInTreeOrder(tags).map((each) => each.id)).toEqual([
      "top",
      "a",
      "b",
    ]);
  });
});

describe("tagPickerOptions", () => {
  const tags = [
    tag("Training"),
    tag("Hypertrophy", ["Training"], ["muscle growth"]),
    tag("Nutrition"),
  ];

  it("offers every tag, matching text being the name, its parents and its aliases", () => {
    expect(tagPickerOptions(tags, [])).toEqual([
      { value: "Nutrition", label: "Nutrition" },
      { value: "Training", label: "Training" },
      {
        value: "Hypertrophy",
        label: "Hypertrophy (Training) muscle growth",
      },
    ]);
  });

  it("leaves out tags that are already chosen", () => {
    const values = tagPickerOptions(tags, ["Training"]).map(
      (option) => option.value,
    );
    expect(values).toEqual(["Nutrition", "Hypertrophy"]);
  });
});
