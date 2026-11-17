/**
 * Tests for the website export: only what is allowed leaves the app. The allow-list is tested from both sides: the exact
 * fields that are exported, and that a field the export does not know about (one added to `Study` later) is not.
 */
import { describe, expect, it } from "vitest";
import { newCatalogue, type Catalogue } from "./catalogue";
import { createStudy, type Study } from "./study";
import { approveSummary, createDraftSummary, withSummary } from "./summary";
import { exampleStudyDetails } from "./testFixtures";
import {
  buildWebsiteExport,
  countApprovedSummaries,
  studiesForWebsite,
  serializeWebsiteExport,
  WEBSITE_EXPORT_VERSION,
} from "./websiteExport";

const NOW = new Date("2026-11-14T09:00:00.000Z");
const ABSTRACT = "A secret publisher abstract that must never be exported.";

/** The fields every exported study has, in the order the export writes them. */
const EXPORTED_STUDY_FIELDS = [
  "id",
  "title",
  "authors",
  "year",
  "journal",
  "volume",
  "issue",
  "pages",
  "doi",
  "url",
  "tagIds",
  "design",
  "subjects",
  "ageGroups",
  "trainingStatuses",
  "sexes",
];

/** A study, with a draft summary when `text` is given, approved when `isApproved`. */
function study(text?: string, isApproved = false): Study {
  const bare = createStudy(exampleStudyDetails({ abstract: ABSTRACT }));
  if (text === undefined) return bare;
  const drafted = withSummary(
    bare,
    createDraftSummary(text, "fullText", NOW),
    NOW,
  );
  return isApproved ? approveSummary(drafted, NOW) : drafted;
}

function catalogueOf(studies: Study[]): Catalogue {
  return { ...newCatalogue(), studies };
}

describe("buildWebsiteExport", () => {
  it("exports exactly the allowed fields of a study with no summary", () => {
    const { studies } = buildWebsiteExport(catalogueOf([study()]), NOW);
    expect(Object.keys(studies[0] ?? {})).toEqual(EXPORTED_STUDY_FIELDS);
  });

  it("carries the bibliographic fields, tags, facets, DOI and url as they are", () => {
    const original = study();
    const exported = buildWebsiteExport(catalogueOf([original]), NOW)
      .studies[0];
    expect(exported).toMatchObject({
      id: original.id,
      title: original.title,
      authors: original.authors,
      year: original.year,
      journal: original.journal,
      doi: original.doi,
      url: original.url,
      tagIds: original.tagIds,
      design: original.design,
      subjects: original.subjects,
      ageGroups: original.ageGroups,
      trainingStatuses: original.trainingStatuses,
      sexes: original.sexes,
    });
  });

  it("never exports the abstract, anywhere in the file", () => {
    const text = serializeWebsiteExport(
      catalogueOf([study("Plain words.", true)]),
      NOW,
    );
    expect(text).not.toContain(ABSTRACT);
    expect(text).not.toContain('"abstract"');
  });

  it("does not export a field it does not know: one added to Study later stays private", () => {
    const withExtraField = {
      ...study(),
      privateNote: "do not publish",
      authors: [
        {
          kind: "person" as const,
          family: "Schoenfeld",
          given: "Brad Jon",
          email: "someone@example.test",
        },
      ],
    };
    const text = serializeWebsiteExport(catalogueOf([withExtraField]), NOW);
    expect(text).not.toContain("privateNote");
    expect(text).not.toContain("do not publish");
    expect(text).not.toContain("someone@example.test");
  });

  it("leaves out created and edited times", () => {
    const exported = buildWebsiteExport(catalogueOf([study()]), NOW).studies[0];
    expect(exported).not.toHaveProperty("createdAt");
    expect(exported).not.toHaveProperty("updatedAt");
  });

  it("exports an approved summary as its words and source only", () => {
    const exported = buildWebsiteExport(
      catalogueOf([study("Plain words.", true)]),
      NOW,
    ).studies[0];
    expect(exported?.summary).toEqual({
      text: "Plain words.",
      source: "fullText",
    });
  });

  it("does not export the file a summary was written from", () => {
    const original = study("Plain words.", true);
    const withFile = {
      ...original,
      summary: {
        text: "Plain words.",
        source: "fullText" as const,
        generatedAt: NOW.toISOString(),
        approvedAt: NOW.toISOString(),
        sourceFile: "(Private, 2026) Name.pdf",
      },
    };
    const text = serializeWebsiteExport(catalogueOf([withFile]), NOW);
    expect(text).not.toContain("Private");
    expect(text).not.toContain("sourceFile");
  });

  it("exports no summary while it is only a draft", () => {
    const text = serializeWebsiteExport(
      catalogueOf([study("Draft words not yet approved.")]),
      NOW,
    );
    expect(text).not.toContain("Draft words not yet approved.");
    expect(text).not.toContain('"summary"');
  });

  it("exports tags as id, name and parents, without aliases", () => {
    const exported = buildWebsiteExport(
      {
        ...newCatalogue(),
        tags: [
          {
            id: "t",
            name: "Topic",
            parentIds: ["p"],
            aliases: ["secret alias"],
          },
        ],
      },
      NOW,
    );
    expect(exported.tags).toEqual([
      { id: "t", name: "Topic", parentIds: ["p"] },
    ]);
  });

  it("names its format version and when it was made", () => {
    const exported = buildWebsiteExport(newCatalogue(), NOW);
    expect(exported.exportVersion).toBe(WEBSITE_EXPORT_VERSION);
    expect(exported.exportedAt).toBe("2026-11-14T09:00:00.000Z");
  });
});

describe("buildWebsiteExport and studies kept off the website", () => {
  /** An approved study, hidden when `isHidden`. */
  function approvedStudy(title: string, isHidden: boolean): Study {
    return {
      ...study("Words.", true),
      title,
      isHiddenFromWebsite: isHidden,
    };
  }

  it("leaves a hidden study out entirely, approved summary or not", () => {
    const catalogue = catalogueOf([
      approvedStudy("Shown", false),
      approvedStudy("Hidden", true),
      { ...study(), title: "Hidden, no summary", isHiddenFromWebsite: true },
    ]);
    const { studies } = buildWebsiteExport(catalogue, NOW);
    expect(studies.map(({ title }) => title)).toEqual(["Shown"]);
  });

  it("never writes the flag, nor its name, into the file", () => {
    const catalogue = catalogueOf([
      approvedStudy("Shown", false),
      approvedStudy("Hidden", true),
    ]);
    const text = serializeWebsiteExport(catalogue, NOW);
    expect(text).not.toContain("isHiddenFromWebsite");
    expect(text).not.toContain("Hidden");
  });

  it("exports the same fields for a shown study as before", () => {
    const { studies } = buildWebsiteExport(
      catalogueOf([approvedStudy("Shown", false)]),
      NOW,
    );
    expect(Object.keys(studies[0] ?? {})).toEqual([
      ...EXPORTED_STUDY_FIELDS,
      "summary",
    ]);
  });

  it("still exports every tag, including one only hidden studies use (tags are not filtered)", () => {
    const hidden = {
      ...approvedStudy("Hidden", true),
      tagIds: ["only-hidden"],
    };
    const catalogue: Catalogue = {
      studies: [hidden],
      tags: [
        { id: "only-hidden", name: "Only Hidden", parentIds: [], aliases: [] },
      ],
    };
    const { tags } = buildWebsiteExport(catalogue, NOW);
    expect(tags.map(({ id }) => id)).toEqual(["only-hidden"]);
  });
});

describe("countApprovedSummaries", () => {
  it("does not count a study kept off the website, which the file leaves out", () => {
    const hidden = { ...study("Approved.", true), isHiddenFromWebsite: true };
    expect(countApprovedSummaries([hidden, study("Approved.", true)])).toBe(1);
  });

  it("counts the approved ones, not drafts or studies with none", () => {
    const studies = [study(), study("Draft."), study("Approved.", true)];
    expect(countApprovedSummaries(studies)).toBe(1);
  });
});

describe("studiesForWebsite", () => {
  it("keeps the studies not hidden, in order, and drops the hidden ones", () => {
    const shown = study();
    const hidden = { ...study(), isHiddenFromWebsite: true };
    expect(studiesForWebsite([hidden, shown])).toEqual([shown]);
  });
});
