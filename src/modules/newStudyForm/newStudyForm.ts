import "../../style/newStudyForm.css";
import { STUDY_CATEGORIES } from "./newStudyCategories";

type StudyCategory = {
  label: string;
  subfields: string[];
};

function header(): HTMLDivElement {
  const header = document.createElement("div");
  header.id = "newStudyFormHeader";
  header.textContent = "Add New Study";

  return header;
}

function inputTitle(): HTMLDivElement {
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

function inputAuthors(): HTMLDivElement {
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

function inputYear(): HTMLDivElement {
  const year = document.createElement("div");
  year.classList.add("studyFormInputContainer");

  const label = document.createElement("label");
  label.classList.add("newStudyFormLabel");
  label.htmlFor = "newStudyYear";
  label.textContent = "Year";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "1665"; // Year of the first scientific journal publication
  input.max = new Date().getFullYear().toString();
  input.id = "newStudyYear";
  input.classList.add("newStudyInput");

  year.append(label);
  year.append(input);

  return year;
}

function inputJournal(): HTMLDivElement {
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

function inputAbstract(): HTMLDivElement {
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

function inputDOI(): HTMLDivElement {
  const DOI = document.createElement("div");
  DOI.classList.add("studyFormInputContainer");

  const label = document.createElement("label");
  label.classList.add("newStudyFormLabel");
  label.htmlFor = "newStudyDOI";
  label.textContent = "DOI";

  const input = document.createElement("input");
  input.type = "url";
  input.id = "newStudyDOI";
  input.classList.add("newStudyInput");

  DOI.append(label);
  DOI.append(input);

  return DOI;
}

function inputURL(): HTMLDivElement {
  const URL = document.createElement("div");
  URL.classList.add("studyFormInputContainer");

  const label = document.createElement("label");
  label.classList.add("newStudyFormLabel");
  label.htmlFor = "newStudyURL";
  label.textContent = "URL";

  const input = document.createElement("input");
  input.type = "url";
  input.id = "newStudyURL";
  input.classList.add("newStudyInput");

  URL.append(label);
  URL.append(input);

  return URL;
}

// Updates the top-level checkbox state and the selected-count badge
// for a given accordion item after any subfield checkbox changes.
function syncParentState(accordionItem: HTMLElement): void {
  const subCheckboxes = Array.from(
    accordionItem.querySelectorAll<HTMLInputElement>(".subfieldCheckbox"),
  );
  const checkedCount = subCheckboxes.filter((cb) => cb.checked).length;

  const parentCheckbox =
    accordionItem.querySelector<HTMLInputElement>(".categoryCheckbox");
  if (!parentCheckbox) return;

  parentCheckbox.checked = checkedCount === subCheckboxes.length;
  parentCheckbox.indeterminate =
    checkedCount > 0 && checkedCount < subCheckboxes.length;

  const badge = accordionItem.querySelector<HTMLSpanElement>(".categoryBadge");
  if (badge) {
    badge.textContent = checkedCount.toString();
    badge.classList.toggle("categoryBadgeVisible", checkedCount > 0);
  }
}

// Builds a single accordion item for one subject and its subfields.
function buildAccordionItem(category: StudyCategory): HTMLDivElement {
  const item = document.createElement("div");
  item.classList.add("accordionItem");

  // --- Header row ---
  const headerRow = document.createElement("div");
  headerRow.classList.add("accordionHeader");

  const parentCheckbox = document.createElement("input");
  parentCheckbox.type = "checkbox";
  parentCheckbox.classList.add("categoryCheckbox");
  parentCheckbox.name = "studyCategories";
  parentCheckbox.value = category.label;
  parentCheckbox.setAttribute("aria-label", `Select all in ${category.label}`);

  const titleSpan = document.createElement("span");
  titleSpan.classList.add("accordionTitle");
  titleSpan.textContent = category.label;

  const badge = document.createElement("span");
  badge.classList.add("categoryBadge");
  badge.setAttribute("aria-live", "polite");

  const chevron = document.createElement("span");
  chevron.classList.add("accordionChevron");
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▾";

  headerRow.append(parentCheckbox, titleSpan, badge, chevron);

  // --- Subfield grid ---
  const body = document.createElement("div");
  body.classList.add("accordionBody");

  category.subfields.forEach((subfield) => {
    const subfieldLabel = document.createElement("label");
    subfieldLabel.classList.add("subfieldLabel");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.classList.add("subfieldCheckbox");
    checkbox.name = "studySubfields";
    checkbox.value = subfield;

    checkbox.addEventListener("change", () => syncParentState(item));

    subfieldLabel.append(checkbox, document.createTextNode(subfield));
    body.append(subfieldLabel);
  });

  // Toggle open/closed when clicking the header row, but not the checkbox itself.
  headerRow.addEventListener("click", (e) => {
    if (e.target === parentCheckbox) return;
    const isOpen = item.classList.toggle("accordionItemOpen");
    chevron.style.transform = isOpen ? "rotate(180deg)" : "";
  });

  // Selecting/deselecting the parent checkbox checks or clears all subfields.
  parentCheckbox.addEventListener("change", () => {
    body
      .querySelectorAll<HTMLInputElement>(".subfieldCheckbox")
      .forEach((cb) => {
        cb.checked = parentCheckbox.checked;
      });
    syncParentState(item);
  });

  item.append(headerRow, body);
  return item;
}

// Builds the full accordion category selector from STUDY_CATEGORIES.
function inputCategories(): HTMLDivElement {
  const container = document.createElement("div");
  container.classList.add("studyFormInputContainer");

  const label = document.createElement("label");
  label.classList.add("newStudyFormLabel");
  label.textContent = "Categories";

  const accordion = document.createElement("div");
  accordion.id = "newStudyCategories";
  accordion.classList.add("accordion");

  (STUDY_CATEGORIES as StudyCategory[]).forEach((category) => {
    accordion.append(buildAccordionItem(category));
  });

  container.append(label, accordion);
  return container;
}

// Returns all selected subfields as an array of strings.
// Call this from your submit/confirm handler to read the category selection.
export function getSelectedSubfields(formEl: HTMLElement): string[] {
  return Array.from(
    formEl.querySelectorAll<HTMLInputElement>(".subfieldCheckbox:checked"),
    (cb) => cb.value,
  );
}

function inputConfirm(): HTMLButtonElement {
  const confirmButton = document.createElement("button");
  confirmButton.id = "studyFormConfirmButton";
  confirmButton.textContent = "Confirm";
  confirmButton.onclick = () => {};

  return confirmButton;
}

export default function newStudyForm(): HTMLDivElement {
  const container = document.createElement("div");
  container.id = "newStudyForm";

  container.append(header());
  container.append(inputTitle());
  container.append(inputAuthors());
  container.append(inputYear());
  container.append(inputJournal());
  container.append(inputAbstract());
  container.append(inputDOI());
  container.append(inputURL());
  container.append(inputCategories());
  container.append(inputConfirm());

  return container;
}
