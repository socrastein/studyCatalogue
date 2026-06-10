import "../style/newStudyForm.css";

function header() {
  const header = document.createElement("div");
  header.id = "newStudyFormHeader";
  header.textContent = "Add New Study";

  return header;
}

function inputTitle() {
  const title = document.createElement("div");
  title.classList.add("studyFormInputContainer");

  const label = document.createElement("label");
  label.classList.add("newStudyFormLabel");
  label.htmlFor = "newStudyTitle";
  label.textContent = "Title";

  const input = document.createElement("textarea");
  input.id = "newStudyTitle";
  input.classList.add("newStudyInput");

  title.append(label);
  title.append(input);

  return title;
}

function inputAuthors() {
  const authors = document.createElement("div");
  authors.classList.add("studyFormInputContainer");

  const label = document.createElement("label");
  label.classList.add("newStudyFormLabel");
  label.htmlFor = "newStudyAuthors";
  label.textContent = "Authors";

  const input = document.createElement("input");
  input.id = "newStudyAuthors";
  input.classList.add("newStudyInput");

  authors.append(label);
  authors.append(input);

  return authors;
}

function inputYear() {
  const year = document.createElement("div");
  year.classList.add("studyFormInputContainer");

  const label = document.createElement("label");
  label.classList.add("newStudyFormLabel");
  label.htmlFor = "newStudyYear";
  label.textContent = "Year";

  const input = document.createElement("input");
  input.id = "newStudyYear";
  input.classList.add("newStudyInput");

  year.append(label);
  year.append(input);

  return year;
}

function inputJournal() {
  const journal = document.createElement("div");
  journal.classList.add("studyFormInputContainer");

  const label = document.createElement("label");
  label.classList.add("newStudyFormLabel");
  label.htmlFor = "newStudyJournal";
  label.textContent = "Journal";

  const input = document.createElement("input");
  input.id = "newStudyJournal";
  input.classList.add("newStudyInput");

  journal.append(label);
  journal.append(input);

  return journal;
}

function inputAbstract() {
  const abstract = document.createElement("div");
  abstract.classList.add("studyFormInputContainer");

  const label = document.createElement("label");
  label.classList.add("newStudyFormLabel");
  label.htmlFor = "newStudyAbstract";
  label.textContent = "Abstract";

  const input = document.createElement("textarea");
  input.id = "newStudyAbstract";
  input.classList.add("newStudyInput");

  abstract.append(label);
  abstract.append(input);

  return abstract;
}

function inputURL() {
  const URL = document.createElement("div");
  URL.classList.add("studyFormInputContainer");

  const label = document.createElement("label");
  label.classList.add("newStudyFormLabel");
  label.htmlFor = "newStudyURL";
  label.textContent = "URL";

  const input = document.createElement("input");
  input.id = "newStudyURL";
  input.classList.add("newStudyInput");

  URL.append(label);
  URL.append(input);

  return URL;
}

function inputCategories() {}

function inputConfirm() {
  const confirmButton = document.createElement("button");
  confirmButton.id = "studyFormConfirmButton";
  confirmButton.textContent = "ADD STUDY";
  confirmButton.onclick = () => {};

  return confirmButton;
}

export default function newStudyForm() {
  const container = document.createElement("div");
  container.id = "newStudyForm";

  container.append(header());
  container.append(inputTitle());
  container.append(inputAuthors());
  container.append(inputYear());
  container.append(inputJournal());
  container.append(inputAbstract());
  container.append(inputURL());
  container.append(inputConfirm());

  return container;
}
