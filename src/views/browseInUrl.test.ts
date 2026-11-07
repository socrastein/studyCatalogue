/**
 * Tests for putting the browse page's filters and sort order in the URL and reading them back, including URLs edited
 * by hand.
 */
import { describe, expect, it } from "vitest";
import { emptyFilters, type StudyFilters } from "../catalogue/filterStudies";
import {
  browseQuery,
  filtersFromQuery,
  queryFromFilters,
  sortOrderFromQuery,
} from "./browseInUrl";

describe("queryFromFilters", () => {
  it("is empty for unset filters, so the unfiltered list is a clean address", () => {
    expect(queryFromFilters({ ...emptyFilters(), query: "  " })).toEqual({});
  });

  it("uses short parameter names and repeats a parameter for several values", () => {
    const filters: StudyFilters = {
      ...emptyFilters(),
      query: " volume ",
      tagIds: ["exercise-science/hypertrophy"],
      trainingStatuses: ["trained", "elite"],
    };
    expect(queryFromFilters(filters)).toEqual({
      q: "volume",
      tag: ["exercise-science/hypertrophy"],
      training: ["trained", "elite"],
    });
  });
});

describe("filtersFromQuery", () => {
  it("reads back what queryFromFilters wrote", () => {
    const filters: StudyFilters = {
      ...emptyFilters(),
      query: "volume",
      designs: ["meta-analysis"],
      ageGroups: ["older-adults"],
      sexes: ["female"],
    };
    const query = queryFromFilters(filters) as Record<
      string,
      string | string[]
    >;
    expect(filtersFromQuery(query)).toEqual(filters);
  });

  it("accepts a parameter given once rather than as a list", () => {
    expect(filtersFromQuery({ design: "cohort" }).designs).toEqual(["cohort"]);
  });

  it("drops facet values that are not in their vocabulary", () => {
    expect(
      filtersFromQuery({ design: ["cohort", "anecdote"] }).designs,
    ).toEqual(["cohort"]);
  });

  it("ignores empty and valueless parameters", () => {
    expect(filtersFromQuery({ q: null, tag: ["", null] })).toEqual(
      emptyFilters(),
    );
  });
});

describe("browseQuery and sortOrderFromQuery", () => {
  it("leave the default order out of the URL", () => {
    expect(browseQuery(emptyFilters(), "newest")).toEqual({});
  });

  it("add a chosen order to the filters, and read it back", () => {
    const filters = { ...emptyFilters(), query: "volume" };
    const query = browseQuery(filters, "author");
    expect(query).toEqual({ q: "volume", sort: "author" });
    expect(sortOrderFromQuery({ sort: "author" })).toBe("author");
  });

  it("fall back to the default for a missing or unknown order", () => {
    expect(sortOrderFromQuery({})).toBe("newest");
    expect(sortOrderFromQuery({ sort: "random" })).toBe("newest");
  });
});
