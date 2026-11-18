<!--
  The tag manager's overview: every topic tag as a tree, and a box to add a new top-level tag. Each tag links to its
  edit page (rename, aliases, parents, merge, delete) and to the studies tagged with it.
-->
<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { findTagByName } from "../catalogue/tags";
import TagTree from "../components/TagTree.vue";
import TextField from "../components/TextField.vue";
import { useCatalogue } from "../stores/catalogueStore";

/** The id of the New Tag text box, which keeps focus after an add. */
const NEW_TAG_BOX_ID = "new-tag-name";

const catalogue = useCatalogue();
const newTagName = ref("");
const newTagError = ref("");
/** What the last Add Tag did, shown under the form; "" when there is nothing to report. */
const confirmation = ref("");

const tags = computed(() => catalogue.state.catalogue.tags);
const studies = computed(() => catalogue.state.catalogue.studies);

/**
 * Adds the typed name as a top-level tag, or refuses it under the box when the name is blank or a tag already has it as
 * a name or alias. The confirmation is announced to screen readers and stays until the next add or error. Focus stays
 * in the box, cleared for the next name, because several tags are usually added in a row.
 */
async function addTag(): Promise<void> {
  const name = newTagName.value.trim();
  const problem = newTagProblem(name);
  confirmation.value = "";
  newTagError.value = problem ?? "";
  if (problem !== null) return;
  const tag = catalogue.findOrCreateTag(name);
  newTagName.value = "";
  confirmation.value = `Added the tag "${tag.name}". It is in the list below.`;
  // The list is drawn again with the new tag once Vue has run its update
  await nextTick();
  const nameBox = focusNewTagBox();
  revealTag(tag.id, nameBox);
}

/**
 * Why the typed name cannot become a new tag, for the message under the box.
 *
 * @param name The name as typed, already trimmed.
 * @returns The message to show, or null when the name is free to use.
 */
function newTagProblem(name: string): string | null {
  if (name === "") return "Enter a name for the new tag.";
  const existing = findTagByName(name, tags.value);
  if (existing) return `A tag called "${existing.name}" already exists.`;
  return null;
}

/**
 * Puts focus back in the name box, since a click on Add Tag moved it to the button. Returns the box so the caller can
 * check it is still in view; null when the box is not on the page.
 */
function focusNewTagBox(): HTMLElement | null {
  const nameBox = document.getElementById(NEW_TAG_BOX_ID);
  nameBox?.focus();
  return nameBox;
}

/**
 * Scrolls the new tag's row into the middle of the window, unless that would push the name box out of view: then the
 * window stays where it was, since the confirmation already says the tag is in the list and the box must stay usable.
 */
function revealTag(tagId: string, nameBox: HTMLElement | null): void {
  const row = document.querySelector<HTMLElement>(
    `[data-tag-id="${CSS.escape(tagId)}"]`,
  );
  if (!row || !nameBox) return;
  const scrollXBefore = window.scrollX;
  const scrollYBefore = window.scrollY;
  row.scrollIntoView({ block: "center" });
  if (!isInWindow(nameBox)) window.scrollTo(scrollXBefore, scrollYBefore);
}

/** Whether the whole element is inside the visible window. */
function isInWindow(element: HTMLElement): boolean {
  const { top, bottom } = element.getBoundingClientRect();
  return top >= 0 && bottom <= window.innerHeight;
}
</script>

<template>
  <h1 tabindex="-1" class="pageTitle h3">Tags</h1>
  <div class="tagsPage">
    <p class="intro">
      Topics form a hierarchy: filtering by a topic also finds studies tagged
      with anything beneath it. A tag with several parents appears under each.
    </p>

    <form class="addTag" novalidate @submit.prevent="addTag">
      <TextField
        :id="NEW_TAG_BOX_ID"
        v-model="newTagName"
        label="New Tag"
        :error="newTagError || undefined"
      />
      <button type="submit" class="btn btnPrimary">Add Tag</button>
    </form>
    <!-- Always present, so screen readers announce the confirmation when it appears -->
    <p
      class="confirmation panel"
      :class="{ isEmpty: confirmation === '' }"
      role="status"
    >
      {{ confirmation }}
    </p>

    <section aria-labelledby="all-tags-heading">
      <h2 id="all-tags-heading" class="sectionTitle">All Tags</h2>
      <TagTree
        :tags="tags"
        :studies="studies"
        :parent-id="null"
        :ancestor-ids="[]"
      />
    </section>
  </div>
</template>

<style scoped>
.tagsPage {
  width: min(100%, 44rem);
  display: flex;
  flex-direction: column;
  gap: var(--space3);
}

.addTag {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space2);
}

.confirmation {
  padding: var(--space1) var(--space2);
  font-weight: 600;
}

/* Keeps the status region in the page for screen readers while there is nothing to say */
.confirmation.isEmpty {
  display: contents;
}

.addTag > :first-child {
  flex: 1 1 16rem;
}
</style>
