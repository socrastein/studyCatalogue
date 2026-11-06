/**
 * Tests for creating and editing studies: ids and timestamps.
 */
import { describe, expect, it } from "vitest";
import { createStudy, updateStudy } from "./study";
import { exampleStudyDetails } from "./testFixtures";

const CREATED = new Date("2026-11-01T10:00:00.000Z");
const EDITED = new Date("2026-11-05T18:30:00.000Z");

describe("createStudy", () => {
  it("keeps the details and stamps creation and update with the same time", () => {
    const study = createStudy(exampleStudyDetails(), CREATED);
    expect(study).toMatchObject(exampleStudyDetails());
    expect(study.createdAt).toBe("2026-11-01T10:00:00.000Z");
    expect(study.updatedAt).toBe(study.createdAt);
  });

  it("gives each study its own id", () => {
    const first = createStudy(exampleStudyDetails());
    const second = createStudy(exampleStudyDetails());
    expect(first.id).not.toBe(second.id);
  });
});

describe("updateStudy", () => {
  it("replaces the details but keeps the id and creation time", () => {
    const original = createStudy(exampleStudyDetails(), CREATED);
    const edited = updateStudy(
      original,
      exampleStudyDetails({ year: 2018 }),
      EDITED,
    );
    expect(edited.year).toBe(2018);
    expect(edited.id).toBe(original.id);
    expect(edited.createdAt).toBe(original.createdAt);
    expect(edited.updatedAt).toBe("2026-11-05T18:30:00.000Z");
  });

  it("leaves the original study unchanged", () => {
    const original = createStudy(exampleStudyDetails(), CREATED);
    updateStudy(original, exampleStudyDetails({ year: 2018 }), EDITED);
    expect(original.year).toBe(2017);
  });
});
