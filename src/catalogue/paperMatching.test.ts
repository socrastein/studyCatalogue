/**
 * Tests for matching paper files to studies: the first author's surname and the year pick the study, the title picks
 * between studies that share both, and a file that cannot be placed is reported with the reason, never dropped.
 */
import { describe, expect, it } from "vitest";
import { matchPapers, unmatchedFileReason } from "./paperMatching";
import { createStudy, type Author, type Study } from "./study";
import { exampleStudyDetails } from "./testFixtures";

/** A study by its first author, year and title; the other fields are the fixture's. */
function studyBy(authors: Author[], year: number, title: string): Study {
  return createStudy(exampleStudyDetails({ authors, year, title }));
}

/** A study whose first author is a person with the given surname. */
function studyWithSurname(surname: string, year: number, title: string): Study {
  return studyBy(
    [{ kind: "person", family: surname, given: "A. B." }],
    year,
    title,
  );
}

describe("matching papers to studies", () => {
  it("matches a file to the study with its first author's surname and year, ignoring accents", () => {
    const aljinovic = studyWithSurname(
      "Aljinović",
      2024,
      "Odds of One-Year Mortality in Bedridden Patients",
    );
    const result = matchPapers(
      [aljinovic],
      ["(Aljinovic, 2024) Odds of One-Year Mortality in Bedridden.pdf"],
    );
    expect(result).toEqual({ studiesWithoutPaper: [], unmatchedFiles: [] });
  });

  it("matches a multi-word surname as a whole", () => {
    const abuRaya = studyWithSurname(
      "Abu Raya",
      2023,
      "Neurobiology of Openness",
    );
    const result = matchPapers(
      [abuRaya],
      ["(Abu Raya, 2023) Neurobiology of Openness.pdf"],
    );
    expect(result.studiesWithoutPaper).toEqual([]);
  });

  it("does not match a surname that only starts the same way, or a file from another year", () => {
    const lee = studyWithSurname("Lee", 2019, "Strength Training");
    const result = matchPapers(
      [lee],
      [
        "(Leeman, 2019) Strength Training.pdf",
        "(Lee, 2020) Strength Training.pdf",
      ],
    );
    expect(result.studiesWithoutPaper).toEqual([lee]);
    expect(result.unmatchedFiles.map((file) => file.kind)).toEqual([
      "noStudy",
      "noStudy",
    ]);
  });

  it("matches on the first author only, not a later author with the same surname", () => {
    const study = studyBy(
      [
        { kind: "person", family: "Ogborn", given: "Dan" },
        { kind: "person", family: "Krieger", given: "James W." },
      ],
      2017,
      "Dose-response relationship",
    );
    const result = matchPapers(
      [study],
      ["(Krieger, 2017) Dose-response relationship.pdf"],
    );
    expect(result.studiesWithoutPaper).toEqual([study]);
    expect(result.unmatchedFiles).toHaveLength(1);
  });

  it("matches an organization's study by the organization's full name", () => {
    const study = studyBy(
      [{ kind: "organization", name: "General Chiropractic Council" }],
      2026,
      "Guidance for Registrants: Claims made for the Chiropractic Vertebral Subluxation Complex",
    );
    const result = matchPapers(
      [study],
      [
        "(General Chiropractic Council, 2026) Claims Made for Chiropractic Vertebral Subluxation Complex.pdf",
      ],
    );
    expect(result.studiesWithoutPaper).toEqual([]);
    expect(result.unmatchedFiles).toEqual([]);
  });

  it("matches an organization's study named by its abbreviation when the year agrees and two title words are shared", () => {
    const study = studyBy(
      [
        {
          kind: "organization",
          name: "National Institute for Health and Care Excellence",
        },
      ],
      2021,
      "Chronic pain (primary and secondary) in over 16s: assessment of all chronic pain",
    );
    const result = matchPapers(
      [study],
      ["(NICE, 2021) Chronic Pain Primary and Secondary NG193.pdf"],
    );
    expect(result.studiesWithoutPaper).toEqual([]);
  });

  it("does not match an organization's study on one shared title word, or in another year", () => {
    const study = studyBy(
      [
        {
          kind: "organization",
          name: "National Institute for Health and Care Excellence",
        },
      ],
      2021,
      "Chronic pain (primary and secondary) in over 16s",
    );
    const oneWord = matchPapers([study], ["(NICE, 2021) Pain Guideline.pdf"]);
    const otherYear = matchPapers(
      [study],
      ["(NICE, 2016) Chronic Pain Primary and Secondary.pdf"],
    );
    expect(oneWord.studiesWithoutPaper).toEqual([study]);
    expect(otherYear.studiesWithoutPaper).toEqual([study]);
  });

  it("lists the studies with no file, sorted by first author, then year, then title", () => {
    const zeta = studyWithSurname("Zeta", 2001, "Late");
    const alphaLater = studyWithSurname("Alpha", 2010, "Second");
    const alphaEarlier = studyWithSurname("Alpha", 2005, "First");
    const accented = studyWithSurname("Ásgeirsdóttir", 2000, "Accent");
    const result = matchPapers([zeta, alphaLater, alphaEarlier, accented], []);
    // Accents are ignored in the sort, so the accented surname falls among the A's, after both Alphas
    expect(result.studiesWithoutPaper).toEqual([
      alphaEarlier,
      alphaLater,
      accented,
      zeta,
    ]);
  });

  it("lets two files belong to one study, which then leaves the to-fetch list once", () => {
    const study = studyWithSurname("Watson", 2017, "LIFTMOR RCT");
    const result = matchPapers(
      [study],
      [
        "(Watson, 2017) LIFTMOR RCT.pdf",
        "(Watson, 2017) LIFTMOR RCT full text.pdf",
      ],
    );
    expect(result).toEqual({ studiesWithoutPaper: [], unmatchedFiles: [] });
  });

  it("reports a name outside the form as not a paper name", () => {
    const study = studyWithSurname("Watson", 2017, "LIFTMOR RCT");
    const result = matchPapers([study], ["scan0042.pdf"]);
    expect(result.unmatchedFiles).toEqual([
      { kind: "notPaperName", fileName: "scan0042.pdf" },
    ]);
    expect(result.studiesWithoutPaper).toEqual([study]);
  });

  it("gives a file to the one study among several with its surname and year whose title shares the most words", () => {
    const hypertrophy = studyWithSurname(
      "Schoenfeld",
      2017,
      "Dose-response relationship of hypertrophy",
    );
    const fatigue = studyWithSurname(
      "Schoenfeld",
      2017,
      "Fatigue and recovery after sprinting",
    );
    const result = matchPapers(
      [hypertrophy, fatigue],
      ["(Schoenfeld, 2017) Dose-response of hypertrophy.pdf"],
    );
    expect(result).toEqual({
      studiesWithoutPaper: [fatigue],
      unmatchedFiles: [],
    });
  });

  it("reports a file as ambiguous, with its candidates, when the titles do not pick one", () => {
    const first = studyWithSurname("Schoenfeld", 2017, "Hypertrophy training");
    const second = studyWithSurname("Schoenfeld", 2017, "Strength training");
    const result = matchPapers(
      [first, second],
      ["(Schoenfeld, 2017) Training volume.pdf"],
    );
    expect(result.unmatchedFiles).toEqual([
      {
        kind: "ambiguous",
        fileName: "(Schoenfeld, 2017) Training volume.pdf",
        candidates: [first, second],
      },
    ]);
    expect(result.studiesWithoutPaper).toEqual([first, second]);
  });

  it("does not count words under four letters when choosing between studies", () => {
    // Both titles share only "rct" and "of", which are too short to count, so the file is ambiguous
    const first = studyWithSurname("Watson", 2017, "Rct of trial one");
    const second = studyWithSurname("Watson", 2017, "Rct of trial two");
    const result = matchPapers(
      [first, second],
      ["(Watson, 2017) RCT of training.pdf"],
    );
    expect(result.unmatchedFiles.map((file) => file.kind)).toEqual([
      "ambiguous",
    ]);
  });

  it("counts a four-letter word when choosing between studies", () => {
    // "mass" is exactly the four-letter bound, so it is the one shared word that picks the second study
    const first = studyWithSurname("Watson", 2017, "Hypertrophy and volume");
    const second = studyWithSurname("Watson", 2017, "Hypertrophy and mass");
    const result = matchPapers(
      [first, second],
      ["(Watson, 2017) Mass gains.pdf"],
    );
    expect(result).toEqual({
      studiesWithoutPaper: [first],
      unmatchedFiles: [],
    });
  });
});

describe("the reason a file is not matched", () => {
  it("says what is wrong with the name, the author and year, or the candidates", () => {
    const first = studyWithSurname("Watson", 2017, "LIFTMOR RCT");
    const second = studyWithSurname("Watson", 2017, "Strength Gains");
    expect(
      unmatchedFileReason({ kind: "notPaperName", fileName: "scan.pdf" }),
    ).toBe("The name is not in the form (Surname, Year) Short Title.pdf.");
    expect(
      unmatchedFileReason({ kind: "noStudy", fileName: "(Lee, 2019) X.pdf" }),
    ).toBe("No study has this first author and year.");
    expect(
      unmatchedFileReason({
        kind: "ambiguous",
        fileName: "(Watson, 2017) Training.pdf",
        candidates: [first, second],
      }),
    ).toBe("It could be any of: LIFTMOR RCT; Strength Gains.");
  });
});
