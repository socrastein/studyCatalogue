export default function newStudyForm() {
  const container = document.createElement("div");
  container.id = "newStudyForm";

  const header = document.createElement("div");
  header.id = "newStudyFormHeader";
  header.textContent = "New Study";

  /**
   * Title
   */
  const title = document.createElement("div");
  title.classList.add("studyFormInputContainer");

  const titleLabel = document.createElement("label");
  titleLabel.classList.add("studyFormLabel");
  titleLabel.htmlFor = "newStudyTitle";
  titleLabel.textContent = "Title";

  const titleInput = document.createElement("input");
  titleInput.id = "newStudyTitle";
  titleInput.classList.add("newStudyTitle");

  title.append(titleLabel);
  title.append(titleInput);

  /**
   * Authors
   */
  const authors = document.createElement("div");
  authors.classList.add("studyFormInputContainer");

  const authorsLabel = document.createElement("label");
  authorsLabel.classList.add("studyFormLabel");
  authorsLabel.htmlFor = "newStudyAuthors";
  authors.textContent = "Authors";

  const authorsInput = document.createElement("input");
  authorsInput.id = "newStudyAuthors";
  authorsInput.classList.add("newStudyAuthors");

  authors.append(authorsLabel);
  authors.append(authorsInput);

  /**
   * Year
   */
  const year = document.createElement("div");
  year.classList.add("studyFormInputContainer");

  const yearLabel = document.createElement("label");
  yearLabel.classList.add("studyFormLabel");
  yearLabel.htmlFor = "newStudyYear";
  yearLabel.textContent = "Year";

  const yearInput = document.createElement("input");
  yearInput.id = "newStudyYear";
  yearInput.classList.add("newStudyYear");

  year.append(yearLabel);
  year.append(yearInput);

  /**
   * Link
   */
  const link = document.createElement("div");
  link.classList.add("studyFormInputContainer");

  const linkLabel = document.createElement("label");
  linkLabel.classList.add("studyFormLabel");
  linkLabel.htmlFor = "newStudyLink";
  linkLabel.textContent = "Web link";

  const linkInput = document.createElement("input");
  linkInput.id = "newStudyLink";
  linkInput.classList.add("newStudyLink");

  link.append(linkLabel);
  link.append(linkInput);

  /**
   * Description
   */
  const description = document.createElement("div");
  description.classList.add("studyFormInputContainer");

  const descriptionLabel = document.createElement("label");
  descriptionLabel.classList.add("studyFormLabel");
  descriptionLabel.htmlFor = "newStudyDescription";
  descriptionLabel.textContent = "Description";

  const descriptionInput = document.createElement("textarea");
  descriptionInput.id = "newStudyDescription";
  descriptionInput.classList.add("newStudyDescription");

  description.append(descriptionLabel);
  description.append(descriptionInput);

  /**
   * Journal
   */
  const journal = document.createElement("div");
  journal.classList.add("studyFormInputContainer");

  const journalLabel = document.createElement("label");
  journalLabel.classList.add("studyFormLabel");
  journalLabel.htmlFor = "newStudyJournal";
  journalLabel.textContent = "Journal";

  const journalInput = document.createElement("input");
  journalInput.id = "newStudyJournal";
  journalInput.classList.add("newStudyJournal");

  journal.append(journalLabel);
  journal.append(journalInput);

  container.append(header);
  container.append(title);
  container.append(authors);
  container.append(year);
  container.append(link);
  container.append(description);
  container.append(journal);

  return container;
}
