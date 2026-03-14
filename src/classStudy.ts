class Study {
  title: string;
  authors: string;
  year: number;
  link: string;
  description: string;
  journal: string;
  categories: Array<string>;

  constructor(
    title: string,
    authors: string,
    year: number,
    link: string,
    description: string,
    journal: string,
    categories: Array<string>,
  ) {
    this.title = title;
    this.authors = authors;
    this.year = year;
    this.link = link;
    this.description = description;
    this.journal = journal;
    this.categories = categories;
  }
}
