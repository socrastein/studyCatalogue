/**
 * Tests for reading paper file names and the text comparison the matching uses: the surname, year and short title come
 * out of the form the papers folder uses, and anything else is refused rather than guessed.
 */
import { describe, expect, it } from "vitest";
import {
  comparableText,
  distinguishingWords,
  parsePaperFileName,
} from "./paperFileName";

describe("parsePaperFileName", () => {
  it("reads the surname, year and short title of a name in the papers folder's form", () => {
    expect(
      parsePaperFileName(
        "(Abu Raya, 2023) Neurobiology of Openness As Personality Trait.pdf",
      ),
    ).toEqual({
      fileName:
        "(Abu Raya, 2023) Neurobiology of Openness As Personality Trait.pdf",
      surname: "Abu Raya",
      year: 2023,
      shortTitle: "Neurobiology of Openness As Personality Trait",
    });
  });

  it("accepts an upper-case extension and keeps accents in the surname", () => {
    expect(parsePaperFileName("(Aljinović, 2024) Odds.PDF")).toMatchObject({
      surname: "Aljinović",
      year: 2024,
    });
  });

  it("refuses names outside the form, so a stray file is reported rather than guessed at", () => {
    expect(parsePaperFileName("deepResearch.md")).toBeNull();
    expect(parsePaperFileName("(Watson 2017) LIFTMOR RCT.pdf")).toBeNull();
    expect(parsePaperFileName("(Watson, 17) LIFTMOR RCT.pdf")).toBeNull();
    expect(parsePaperFileName("(Watson, 2017).pdf")).toBeNull();
    expect(parsePaperFileName("(Watson, 2017) LIFTMOR RCT.pdf.txt")).toBeNull();
  });
});

describe("comparableText", () => {
  it("ignores case, accents and repeated spaces", () => {
    expect(comparableText("  Aljinović  ")).toBe("aljinovic");
    expect(comparableText("Abu   Raya")).toBe("abu raya");
    expect(comparableText("Aljinovic")).toBe(comparableText("ALJINOVIĆ"));
  });
});

describe("distinguishingWords", () => {
  it("keeps words of four or more letters, and drops the shorter ones", () => {
    // "rct" is three letters and "of" two, so neither counts; "mass" is exactly four, the bound, so it counts
    expect([...distinguishingWords("LIFTMOR RCT, of Mass")].sort()).toEqual([
      "liftmor",
      "mass",
    ]);
  });

  it("counts each word once, whatever its case, and splits at punctuation", () => {
    expect(
      [...distinguishingWords("Strength-Training, strength training")].sort(),
    ).toEqual(["strength", "training"]);
  });
});
