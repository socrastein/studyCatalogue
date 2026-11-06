/**
 * Tests for putting browse filters in the URL and reading them back, including URLs edited by hand.
 */
import { describe, expect, it } from "vitest";
import { emptyFilters, type StudyFilters } from "../catalogue/filterStudies";
import { filtersFromQuery, queryFromFilters } from "./filtersInUrl";

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
