/**
 * Tests for saving the catalogue as text and reading it back: the round trip, and every kind of bad data being
 * rejected with a message that says where it is wrong.
 */
import { describe, expect, it } from "vitest";
import type { Catalogue } from "./catalogue";
import { newCatalogue } from "./catalogue";
import {
  parseCatalogue,
  SCHEMA_VERSION,
  serializeCatalogue,
} from "./serialization";
import { createStudy } from "./study";
import { exampleStudyDetails } from "./testFixtures";

/** A catalogue with the seed tags and one example study. */
function exampleCatalogue(): Catalogue {
  const study = createStudy(exampleStudyDetails());
  return { ...newCatalogue(), studies: [study] };
}

/**
 * The saved form of the example catalogue, loosely typed so a test can break it in ways the real types forbid. The
 * fields tests reach into are spelled out; the rest is `unknown`.
 */
type LooseSavedData = {
  schemaVersion?: unknown;
  // Non-empty tuples: the example catalogue always has a study and tags, so [0] is safe to reach into
  studies: [LooseStudy, ...LooseStudy[]];
  tags: [LooseTag, ...LooseTag[]];
};

type LooseStudy = Record<string, unknown> & { tagIds: string[] };
type LooseTag = Record<string, unknown> & { parentIds: string[] };

/** The serialized example catalogue with `change` applied to its saved form, turned back into text. */
function corruptedText(change: (data: LooseSavedData) => void): string {
  const data: LooseSavedData = JSON.parse(
    serializeCatalogue(exampleCatalogue()),
  );
  change(data);
  return JSON.stringify(data);
}

/** The problem message `parseCatalogue` gives for the text; fails the test if the text parses. */
function problemWith(text: string): string {
  const result = parseCatalogue(text);
  if (result.kind === "parsed")
    throw new Error("expected the text to be rejected");
  return result.problem;
}

describe("serializeCatalogue and parseCatalogue", () => {
  it("round-trip a catalogue unchanged", () => {
    const catalogue = exampleCatalogue();
    expect(parseCatalogue(serializeCatalogue(catalogue))).toEqual({
      kind: "parsed",
      catalogue,
    });
  });

  it("write the schema version into the text", () => {
    const data = JSON.parse(serializeCatalogue(newCatalogue()));
    expect(data.schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe("parseCatalogue rejects", () => {
  it("text that is not JSON", () => {
    expect(problemWith("{not json")).toBe("The data is not valid JSON.");
  });

  it("data from a newer version of the app, saying so", () => {
    const text = corruptedText(
      (data) => (data.schemaVersion = SCHEMA_VERSION + 1),
    );
    expect(problemWith(text)).toContain("saved by a newer version of the app");
  });

  it("data with no schema version", () => {
    const text = corruptedText((data) => delete data.schemaVersion);
    expect(problemWith(text)).toContain("format version should be 1");
  });

  it("a study with a field of the wrong type, naming the study and field", () => {
    const text = corruptedText((data) => (data.studies[0].year = "2017"));
    expect(problemWith(text)).toContain(
      "study 1: year should be a whole number",
    );
  });

  it("a facet value outside its vocabulary", () => {
    const text = corruptedText((data) => (data.studies[0].design = "anecdote"));
    expect(problemWith(text)).toContain(
      'study 1: design has an unknown value "anecdote"',
    );
  });

  it("a study with no authors", () => {
    const text = corruptedText((data) => (data.studies[0].authors = []));
    expect(problemWith(text)).toContain("should name at least one author");
  });

  it("a study tagged with a tag that does not exist", () => {
    const text = corruptedText((data) =>
      data.studies[0].tagIds.push("missing"),
    );
    expect(problemWith(text)).toContain(
      'refers to a tag that does not exist ("missing")',
    );
  });

  it("a tag whose parent does not exist", () => {
    const text = corruptedText((data) =>
      data.tags[0].parentIds.push("missing"),
    );
    expect(problemWith(text)).toContain(
      'tag "Exercise Science" refers to a tag that does not exist',
    );
  });

  it("two tags with the same id", () => {
    const text = corruptedText((data) => data.tags.push(data.tags[0]));
    expect(problemWith(text)).toContain(
      'two tag entries share the id "exercise-science"',
    );
  });
});

describe("parseCatalogue accepts", () => {
  it("a study with no DOI, URL, volume, issue or pages", () => {
    const text = corruptedText((data) => {
      for (const field of ["doi", "url", "volume", "issue", "pages"])
        data.studies[0][field] = null;
    });
    expect(parseCatalogue(text).kind).toBe("parsed");
  });

  it("a study reporting no age groups, training status or sex", () => {
    const text = corruptedText((data) => {
      data.studies[0].ageGroups = [];
      data.studies[0].trainingStatuses = [];
      data.studies[0].sexes = [];
    });
    expect(parseCatalogue(text).kind).toBe("parsed");
  });

  it("an author saved before organizations existed, as a person", () => {
    const text = corruptedText((data) => {
      data.studies[0].authors = [{ family: "Smith", given: "J." }];
    });
    const result = parseCatalogue(text);
    expect(
      result.kind === "parsed" && result.catalogue.studies[0]?.authors,
    ).toEqual([{ kind: "person", family: "Smith", given: "J." }]);
  });

  it("an organization author", () => {
    const text = corruptedText((data) => {
      data.studies[0].authors = [{ kind: "organization", name: "WHO" }];
    });
    expect(parseCatalogue(text).kind).toBe("parsed");
  });
});

describe("parseCatalogue rejects authors", () => {
  it("of an unknown kind", () => {
    const text = corruptedText((data) => {
      data.studies[0].authors = [{ kind: "robot", name: "HAL" }];
    });
    expect(problemWith(text)).toContain("unknown author kind");
  });
});
