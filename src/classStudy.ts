import generateUID from "./generateUID";

export class Study {
  private UID: string;

  title: string;
  authors: string;
  year: number;
  journal: string;
  abstract: string;
  URL: string;
  categories: Array<string>;

  constructor(
    UID: string | undefined,
    title: string,
    authors: string,
    year: number,
    journal: string,
    abstract: string,
    URL: string,
    categories: Array<string>,
  ) {
    this.UID = UID ?? generateUID();
    this.title = title;
    this.authors = authors;
    this.year = year;
    this.journal = journal;
    this.abstract = abstract;
    this.URL = URL;
    this.categories = categories;
  }

  /**
   * Returns a string with "Authors (Year)"
   */
  get citationShort(): string {
    return `${this.authors} (${this.year})`;
  }

  /**
   * Returns a string containing the short citation
   * as a markdown hyperlink for pasting on Reddit or
   * another platform that uses markdown.
   */
  get citationLinked(): string {
    return `[${this.citationShort}](${this.URL})`;
  }

  /**
   * Returns a string in AMA format that can be used
   * for standardized references in a paper.
   */
  get citationAMA(): string {
    return "Not implemented yet";
  }

  saveStudy(): void {
    const studyJSON = JSON.stringify(this);
    localStorage.setItem(`studyCatalogue_${this.UID}`, studyJSON);
  }
}
