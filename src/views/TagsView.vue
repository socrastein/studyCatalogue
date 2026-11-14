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

const catalogue = useCatalogue();
const newTagName = ref("");
const newTagError = ref("");
/** What the last Add Tag did, shown under the form; "" when there is nothing to report. */
const confirmation = ref("");

const tags = computed(() => catalogue.state.catalogue.tags);
const studies = computed(() => catalogue.state.catalogue.studies);

/**
 * Adds the typed name as a top-level tag, unless it is blank or a tag already has that name or alias. A new tag is
 * confirmed in words under the form and shown in the list: the list is long and the tag lands in alphabetical order,
 * possibly off screen, so it is scrolled into view and its link takes focus.
 */
async function addTag(): Promise<void> {
  const name = newTagName.value.trim();
  const existing = findTagByName(name, tags.value);
  if (name === "") {
    newTagError.value = "Enter a name for the new tag.";
    return;
  }
  if (existing) {
    newTagError.value = `A tag called "${existing.name}" already exists.`;
    return;
  }
  const tag = catalogue.findOrCreateTag(name);
  newTagError.value = "";
  newTagName.value = "";
  confirmation.value = `Added the tag "${tag.name}". It is in the list below.`;
  // The list is drawn again with the new tag once Vue has run its update
  await nextTick();
  revealTag(tag.id);
}

/** Scrolls the tag's row into the middle of the window and moves focus to its link, so the new tag is seen and reachable. */
function revealTag(tagId: string): void {
  const row = document.querySelector<HTMLElement>(
    `[data-tag-id="${CSS.escape(tagId)}"]`,
  );
  row?.scrollIntoView({ block: "center" });
  row?.querySelector<HTMLElement>("a")?.focus();
}

/** Typing starts a new name, so the confirmation of the last one is out of date. */
function clearConfirmation(): void {
  confirmation.value = "";
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
        id="new-tag-name"
        v-model="newTagName"
        label="New Tag"
        :error="newTagError || undefined"
        @update:model-value="clearConfirmation"
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
