/**
 * Tests for adding a backup to the catalogue: which copy of a study wins, how tags from two catalogues become one,
 * and that nothing already here is lost.
 */
import { describe, expect, it } from "vitest";
import { mergeBackup } from "./backupMerge";
import type { Catalogue } from "./catalogue";
import type { Study } from "./study";
import {
  approveSummary,
  createDraftSummary,
  withSummary,
  type StudySummary,
} from "./summary";
import type { Tag } from "./tags";
import { exampleStudyDetails } from "./testFixtures";

const JANUARY = "2026-01-10T12:00:00.000Z";
const MARCH = "2026-03-10T12:00:00.000Z";

/** A saved study with a fixed id and times, and any details replaced by `overrides`. */
function study(id: string, updatedAt: string, overrides = {}): Study {
  return {
    ...exampleStudyDetails({ doi: null, tagIds: [], ...overrides }),
    id,
    createdAt: JANUARY,
    updatedAt,
  };
}

/** A tag with a fixed id. */
function tag(id: string, name: string, extras: Partial<Tag> = {}): Tag {
  return { id, name, parentIds: [], aliases: [], ...extras };
}

function catalogue(studies: Study[], tags: Tag[] = []): Catalogue {
  return { studies, tags };
}

describe("mergeBackup: studies", () => {
  it("adds studies the catalogue does not have, keeping everything already here", () => {
    const mine = study("mine", JANUARY, { title: "Mine" });
    const theirs = study("theirs", JANUARY, { title: "Theirs" });
    const { catalogue: merged, summary } = mergeBackup(
      catalogue([mine]),
      catalogue([theirs]),
    );
    expect(merged.studies.map(({ id }) => id)).toEqual(["mine", "theirs"]);
    expect(summary.addedStudies).toBe(1);
  });

  it("takes the backup's copy of a study when it was edited more recently", () => {
    const mine = study("same", JANUARY, { title: "Old title" });
    const theirs = study("same", MARCH, { title: "New title" });
    const { catalogue: merged, summary } = mergeBackup(
      catalogue([mine]),
      catalogue([theirs]),
    );
    expect(merged.studies).toEqual([theirs]);
    expect(summary.updatedStudies).toBe(1);
  });

  it("keeps this catalogue's copy when it is as recent or more recent", () => {
    const mine = study("same", MARCH, { title: "My edit" });
    const theirs = study("same", JANUARY, { title: "Older" });
    const tied = study("tied", JANUARY, { title: "Mine wins a tie" });
    const tiedTheirs = study("tied", JANUARY, { title: "Theirs" });
    const { catalogue: merged, summary } = mergeBackup(
      catalogue([mine, tied]),
      catalogue([theirs, tiedTheirs]),
    );
    expect(merged.studies).toEqual([mine, tied]);
    expect(summary.unchangedStudies).toBe(2);
  });

  it("matches a study entered separately in both by its DOI, ignoring case, and keeps this catalogue's id and creation time", () => {
    const mine = study("mine", JANUARY, { doi: "10.1080/ABC" });
    const theirs = {
      ...study("theirs", MARCH, { doi: "10.1080/abc", title: "Newer" }),
      createdAt: MARCH,
    };
    const { catalogue: merged, summary } = mergeBackup(
      catalogue([mine]),
      catalogue([theirs]),
    );
    expect(merged.studies).toHaveLength(1);
    expect(merged.studies[0]).toMatchObject({
      id: "mine",
      createdAt: JANUARY,
      title: "Newer",
    });
    expect(summary.updatedStudies).toBe(1);
  });

  it("does not treat two studies without DOIs as the same", () => {
    const { summary } = mergeBackup(
      catalogue([study("mine", JANUARY)]),
      catalogue([study("theirs", JANUARY)]),
    );
    expect(summary.addedStudies).toBe(1);
  });
});

describe("mergeBackup: tags", () => {
  it("adds tags the catalogue does not have", () => {
    const { catalogue: merged, summary } = mergeBackup(
      catalogue([], [tag("a", "Creatine")]),
      catalogue([], [tag("b", "Sleep")]),
    );
    expect(merged.tags.map(({ name }) => name)).toEqual(["Creatine", "Sleep"]);
    expect(summary.addedTags).toBe(1);
  });

  it("files a backup study under this catalogue's tag of the same name, created separately in each", () => {
    const { catalogue: merged, summary } = mergeBackup(
      catalogue([], [tag("mine", "Creatine")]),
      catalogue(
        [study("s", JANUARY, { tagIds: ["theirs"] })],
        [tag("theirs", "creatine")],
      ),
    );
    expect(merged.tags.map(({ id }) => id)).toEqual(["mine"]);
    expect(merged.studies[0]?.tagIds).toEqual(["mine"]);
    expect(summary.addedTags).toBe(0);
  });

  it("matches a backup tag by one of this tag's aliases", () => {
    const hypertrophy = tag("h", "Hypertrophy", { aliases: ["muscle growth"] });
    const { catalogue: merged } = mergeBackup(
      catalogue([], [hypertrophy]),
      catalogue([], [tag("x", "Muscle growth")]),
    );
    expect(merged.tags).toEqual([hypertrophy]);
  });

  it("keeps a differently named tag with the same id under this catalogue's name, the backup's name becoming an alias", () => {
    const { catalogue: merged } = mergeBackup(
      catalogue([], [tag("t", "Training", { aliases: ["lifting"] })]),
      catalogue([], [tag("t", "Exercise science", { aliases: ["lifting"] })]),
    );
    expect(merged.tags).toEqual([
      tag("t", "Training", { aliases: ["lifting", "Exercise science"] }),
    ]);
  });

  it("adds the backup's parents to a matched tag, mapped to this catalogue's tags", () => {
    const { catalogue: merged } = mergeBackup(
      catalogue([], [tag("n", "Nutrition"), tag("c", "Creatine")]),
      catalogue(
        [],
        [
          tag("supplements", "Supplements"),
          tag("their-c", "Creatine", { parentIds: ["supplements"] }),
        ],
      ),
    );
    expect(merged.tags.find(({ id }) => id === "c")?.parentIds).toEqual([
      "supplements",
    ]);
  });

  it("skips a backup parent that would put a tag under its own descendant", () => {
    const mine = [
      tag("parent", "Nutrition"),
      tag("child", "Protein", { parentIds: ["parent"] }),
    ];
    const reversed = [
      tag("child", "Protein"),
      tag("parent", "Nutrition", { parentIds: ["child"] }),
    ];
    const { catalogue: merged } = mergeBackup(
      catalogue([], mine),
      catalogue([], reversed),
    );
    expect(merged.tags).toEqual(mine);
  });

  it("drops a study's tag that the backup does not hold, and repeats of one tag", () => {
    const { catalogue: merged } = mergeBackup(
      catalogue([], [tag("c", "Creatine")]),
      catalogue(
        [study("s", JANUARY, { tagIds: ["x", "y", "missing"] })],
        [tag("x", "Creatine"), tag("y", "creatine")],
      ),
    );
    expect(merged.studies[0]?.tagIds).toEqual(["c"]);
  });
});

/** A summary with fixed words and times, approved or not. */
function summary(text: string, approvedAt: string | null): StudySummary {
  return { text, source: "abstract", generatedAt: JANUARY, approvedAt };
}

describe("mergeBackup: summaries", () => {
  it("carries a summary in with a study the catalogue did not have", () => {
    const theirs = {
      ...study("theirs", JANUARY),
      summary: summary("Hers.", null),
    };
    const { catalogue: merged } = mergeBackup(
      catalogue([]),
      catalogue([theirs]),
    );
    expect(merged.studies[0]?.summary?.text).toBe("Hers.");
  });

  it("takes the newer copy's summary", () => {
    const mine = {
      ...study("same", JANUARY),
      summary: summary("Old.", JANUARY),
    };
    const theirs = { ...study("same", MARCH), summary: summary("New.", MARCH) };
    const { catalogue: merged } = mergeBackup(
      catalogue([mine]),
      catalogue([theirs]),
    );
    expect(merged.studies[0]?.summary).toEqual(theirs.summary);
  });

  it("keeps this catalogue's summary when its copy is the newer", () => {
    const mine = { ...study("same", MARCH), summary: summary("Mine.", MARCH) };
    const theirs = {
      ...study("same", JANUARY),
      summary: summary("Older.", JANUARY),
    };
    const { catalogue: merged } = mergeBackup(
      catalogue([mine]),
      catalogue([theirs]),
    );
    expect(merged.studies).toEqual([mine]);
  });

  it("leaves a newer draft from the backup unapproved when it replaces an approved summary with other words", () => {
    const mine = {
      ...study("same", JANUARY),
      summary: summary("Approved words.", JANUARY),
    };
    const theirs = {
      ...study("same", MARCH),
      summary: summary("A new draft.", null),
    };
    const { catalogue: merged } = mergeBackup(
      catalogue([mine]),
      catalogue([theirs]),
    );
    expect(merged.studies[0]?.summary).toMatchObject({
      text: "A new draft.",
      approvedAt: null,
    });
  });

  it("keeps the approval when the newer copy's draft has the same words", () => {
    const mine = {
      ...study("same", JANUARY),
      summary: summary("Same words.", JANUARY),
    };
    const theirs = {
      ...study("same", MARCH),
      summary: summary("Same words.", null),
    };
    const { catalogue: merged } = mergeBackup(
      catalogue([mine]),
      catalogue([theirs]),
    );
    expect(merged.studies[0]?.summary?.approvedAt).toBe(JANUARY);
  });

  it("does not lose this catalogue's summary to a newer copy that has none (a version 1 backup)", () => {
    const mine = {
      ...study("same", JANUARY),
      summary: summary("Mine.", JANUARY),
    };
    const theirs = study("same", MARCH, { title: "Retitled" });
    const { catalogue: merged } = mergeBackup(
      catalogue([mine]),
      catalogue([theirs]),
    );
    expect(merged.studies[0]).toMatchObject({ title: "Retitled" });
    expect(merged.studies[0]?.summary).toEqual(mine.summary);
  });

  it("fills in a summary from an older copy when this catalogue's newer copy has none", () => {
    const mine = study("same", MARCH);
    const theirs = {
      ...study("same", JANUARY),
      summary: summary("Theirs.", JANUARY),
    };
    const { catalogue: merged, summary: counts } = mergeBackup(
      catalogue([mine]),
      catalogue([theirs]),
    );
    expect(merged.studies[0]?.summary).toEqual(theirs.summary);
    expect(merged.studies[0]?.updatedAt).toBe(MARCH);
    expect(counts.updatedStudies).toBe(1);
  });

  it("keeps a study as it is when neither copy has a summary", () => {
    const mine = study("same", JANUARY);
    const theirs = study("same", MARCH, { title: "Newer" });
    const { catalogue: merged } = mergeBackup(
      catalogue([mine]),
      catalogue([theirs]),
    );
    expect(merged.studies[0]).not.toHaveProperty("summary");
  });

  it("works with the summary operations: a draft edited on one machine reaches the other", () => {
    const base = study("same", JANUARY);
    const drafted = withSummary(
      base,
      createDraftSummary("Draft.", "abstract", new Date(JANUARY)),
      new Date(JANUARY),
    );
    const approved = approveSummary(drafted, new Date(MARCH));
    const { catalogue: merged } = mergeBackup(
      catalogue([drafted]),
      catalogue([approved]),
    );
    expect(merged.studies[0]?.summary?.approvedAt).toBe(MARCH);
  });
});
