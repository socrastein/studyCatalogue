/**
 * Browser tests for the Fetch page: the studies with no PDF in the papers folder, the files that could not be matched,
 * and what the page says when the folder cannot be checked. Each test runs its own home server (homeServerFixture.ts)
 * over a temporary papers folder with made-up file names; the catalogue is saved to that server first.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { newCatalogue } from "../src/catalogue/catalogue";
import { saveRequestText } from "../src/catalogue/homeServerProtocol";
import {
  createStudy,
  type Author,
  type StudyDetails,
} from "../src/catalogue/study";
import { expectNoAxeViolations } from "./expectNoAxeViolations";
import { expect, test, type RunningHomeServer } from "./homeServerFixture";
import { studyDetails } from "./seedCatalogue";

/** The title of the example study that a PDF below is named for, so the file matches it. */
const SCHOENFELD_TITLE =
  "Dose-response relationship between weekly resistance training volume and increases in muscle mass";

/** The PDF of the Schoenfeld study above: its first author's surname and year, and words of its title. */
const SCHOENFELD_FILE = "(Schoenfeld, 2017) Dose-response relationship.pdf";

/** Saves a catalogue of these studies to the home server, as the app's own first save would. */
async function saveStudiesToServer(
  page: Page,
  homeServer: RunningHomeServer,
  studies: StudyDetails[],
): Promise<void> {
  const catalogue = {
    ...newCatalogue(),
    studies: studies.map((details) => createStudy(details)),
  };
  const response = await page.request.put(`${homeServer.url}api/catalogue`, {
    headers: { "Content-Type": "application/json" },
    data: saveRequestText({ baseRevision: 0, catalogue }),
  });
  expect(response.status()).toBe(200);
}

/** Puts empty PDF files with these names in the papers folder, in folders where a name has a slash. */
async function putPapers(folder: string, fileNames: string[]): Promise<void> {
  for (const fileName of fileNames) {
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, fileName), "");
  }
}

/** A person author with this surname. */
function author(family: string): Author {
  return { kind: "person", family, given: "A. B." };
}

test("lists the studies with no PDF, with their authors and a DOI link or No DOI", async ({
  page,
  homeServer,
}) => {
  await putPapers(homeServer.papersFolder, [SCHOENFELD_FILE]);
  await saveStudiesToServer(page, homeServer, [
    studyDetails({ title: SCHOENFELD_TITLE }),
    studyDetails({
      title: "LIFTMOR randomised trial",
      authors: [author("Watson"), author("Lee")],
      year: 2017,
      doi: "10.1000/liftmor",
    }),
    studyDetails({
      title: "Bedridden patients over one year",
      authors: [author("Aljinović")],
      year: 2024,
      doi: null,
    }),
  ]);

  await page.goto("/fetch");
  await expect(page.getByText("2 studies to fetch")).toBeVisible();
  const list = page.getByRole("region", { name: "Studies to Fetch" });
  await expect(list.getByText("LIFTMOR randomised trial")).toBeVisible();
  await expect(list.getByText("Watson & Lee")).toBeVisible();
  await expect(
    list.getByRole("link", { name: "10.1000/liftmor" }),
  ).toHaveAttribute("href", "https://doi.org/10.1000/liftmor");
  await expect(list.getByText("No DOI")).toBeVisible();
  // The study with a PDF is not listed
  await expect(list.getByText(SCHOENFELD_TITLE)).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test("lists the files that matched no study or several, with the reason, under Files Not Matched", async ({
  page,
  homeServer,
}) => {
  await putPapers(homeServer.papersFolder, [
    "(Lee, 2019) Unknown Study.pdf",
    "scan0042.pdf",
  ]);
  await saveStudiesToServer(page, homeServer, [
    studyDetails({ title: SCHOENFELD_TITLE }),
  ]);

  await page.goto("/fetch");
  const unmatched = page.getByRole("region", { name: "Files Not Matched" });
  await expect(
    unmatched.getByText("(Lee, 2019) Unknown Study.pdf"),
  ).toBeVisible();
  await expect(
    unmatched.getByText("No study has this first author and year."),
  ).toBeVisible();
  await expect(unmatched.getByText("scan0042.pdf")).toBeVisible();
  await expect(
    unmatched.getByText(
      "The name is not in the form (Surname, Year) Short Title.pdf.",
    ),
  ).toBeVisible();
  await expectNoAxeViolations(page);
});

test("hides Files Not Matched when every file belongs to one study", async ({
  page,
  homeServer,
}) => {
  await putPapers(homeServer.papersFolder, [SCHOENFELD_FILE]);
  await saveStudiesToServer(page, homeServer, [
    studyDetails({ title: SCHOENFELD_TITLE }),
  ]);

  await page.goto("/fetch");
  await expect(
    page.getByText("Every study has a PDF in the papers folder."),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Files Not Matched" }),
  ).toHaveCount(0);
});

test("says the papers folder cannot be read, with the server's message, and lists nothing", async ({
  page,
  homeServer,
}) => {
  await saveStudiesToServer(page, homeServer, [
    studyDetails({ title: SCHOENFELD_TITLE }),
  ]);
  // The drive is "unmounted": the folder is gone
  await rm(homeServer.papersFolder, { recursive: true, force: true });

  await page.goto("/fetch");
  const problem = page.getByRole("region", {
    name: "The Papers Folder Could Not Be Checked",
  });
  await expect(problem).toContainText(
    `The papers folder ${homeServer.papersFolder} cannot be read`,
  );
  await expect(problem).toContainText("Is the drive mounted?");
  await expect(
    page.getByRole("region", { name: "Studies to Fetch" }),
  ).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test("says the home server did not answer when the list cannot be reached", async ({
  page,
  homeServer,
}) => {
  await saveStudiesToServer(page, homeServer, [
    studyDetails({ title: SCHOENFELD_TITLE }),
  ]);
  await page.route("**/api/papers", (route) => route.abort());

  await page.goto("/fetch");
  await expect(
    page.getByRole("region", {
      name: "The Papers Folder Could Not Be Checked",
    }),
  ).toContainText("The home server did not answer");
  await expect(
    page.getByRole("region", { name: "Studies to Fetch" }),
  ).toHaveCount(0);
});
