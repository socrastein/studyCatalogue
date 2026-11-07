/**
 * The style rules (lifting-school-ui's checker): every colour, font size, radius, spacing value and duration in the
 * app's stylesheets comes from the library's design tokens. These are the app's deliberate exceptions, each a decision
 * recorded with its reason; anything not listed here must use the tokens.
 */
import {
  describeStyleProblem,
  findStyleProblemsUnder,
  type StyleException,
} from "lifting-school-ui/styleRules";
import { describe, expect, it } from "vitest";

const EXCEPTIONS: StyleException[] = [];

describe("the app's stylesheets", () => {
  it("take every colour, font size, radius, spacing value and duration from the tokens, apart from the listed exceptions", () => {
    const problems = findStyleProblemsUnder("src", EXCEPTIONS);
    expect(problems.map(describeStyleProblem)).toEqual([]);
  });
});
