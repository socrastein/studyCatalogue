<!--
  The study's authors, one row each (family name, given names), in the paper's order. Rows can be added and removed;
  adding one moves focus to its family name field so typing can carry straight on. Each row's validation message
  comes from the draft errors, keyed "authors.<row>.family".
-->
<script setup lang="ts">
import { nextTick } from "vue";
import type { Author } from "../catalogue/study";
import type { DraftErrors } from "../catalogue/studyDraft";

defineProps<{ errors: DraftErrors }>();

const authors = defineModel<Author[]>({ required: true });

/** The id of a row's family name input, which the error summary links to. */
function familyInputId(index: number): string {
  return `author-${index}-family`;
}

/** Adds an empty row at the end and puts the cursor in its family name. */
async function addAuthor(): Promise<void> {
  authors.value.push({ family: "", given: "" });
  await nextTick();
  const newIndex = authors.value.length - 1;
  document.getElementById(familyInputId(newIndex))?.focus();
}

/** Removes a row, then moves focus to the row that took its place (or the new last row), so focus is not lost. */
async function removeAuthor(index: number): Promise<void> {
  authors.value.splice(index, 1);
  await nextTick();
  const nextIndex = Math.min(index, authors.value.length - 1);
  document.getElementById(familyInputId(nextIndex))?.focus();
}
</script>

<template>
  <fieldset class="authors" aria-describedby="authors-hint">
    <legend>Authors</legend>
    <p id="authors-hint" class="fieldHint">
      In the order the paper lists them. Given names can be full names or
      initials.
    </p>
    <ol class="authorRows">
      <li v-for="(author, index) in authors" :key="index" class="authorRow">
        <div class="nameField">
          <label :for="familyInputId(index)">
            Family name<span class="visuallyHidden"
              >, author {{ index + 1 }}</span
            >
          </label>
          <p
            v-if="errors[`authors.${index}.family`]"
            :id="`author-${index}-family-error`"
            class="fieldError"
          >
            {{ errors[`authors.${index}.family`] }}
          </p>
          <input
            :id="familyInputId(index)"
            v-model="author.family"
            autocomplete="off"
            :aria-invalid="
              errors[`authors.${index}.family`] ? 'true' : undefined
            "
            :aria-describedby="
              errors[`authors.${index}.family`]
                ? `author-${index}-family-error`
                : undefined
            "
          />
        </div>
        <div class="nameField">
          <label :for="`author-${index}-given`">
            Given names<span class="visuallyHidden"
              >, author {{ index + 1 }}</span
            >
          </label>
          <input
            :id="`author-${index}-given`"
            v-model="author.given"
            autocomplete="off"
          />
        </div>
        <button
          v-if="authors.length > 1"
          type="button"
          class="secondaryButton removeButton"
          @click="removeAuthor(index)"
        >
          Remove<span class="visuallyHidden"> author {{ index + 1 }}</span>
        </button>
      </li>
    </ol>
    <button type="button" class="secondaryButton" @click="addAuthor">
      Add another author
    </button>
  </fieldset>
</template>

<style scoped>
.authors {
  border: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

legend {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.authorRows {
  width: 100%;
  padding-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.authorRow {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem 1rem;
}

.nameField {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1 1 12rem;
}

.nameField label {
  font-weight: bold;
}

.nameField input {
  padding: 0.4rem 0.5rem;
}

.removeButton {
  padding: 0.4rem 0.75rem;
}
</style>
