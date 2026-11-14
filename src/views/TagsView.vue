<!--
  The tag manager's overview: every topic tag as a tree, and a box to add a new top-level tag. Each tag links to its
  edit page (rename, aliases, parents, merge, delete) and to the studies tagged with it.
-->
<script setup lang="ts">
import { computed, ref } from "vue";
import { findTagByName } from "../catalogue/tags";
import TagTree from "../components/TagTree.vue";
import TextField from "../components/TextField.vue";
import { useCatalogue } from "../stores/catalogueStore";

const catalogue = useCatalogue();
const newTagName = ref("");
const newTagError = ref("");
const announcement = ref("");

const tags = computed(() => catalogue.state.catalogue.tags);
const studies = computed(() => catalogue.state.catalogue.studies);

/** Adds the typed name as a top-level tag, unless it is blank or a tag already has that name or alias. */
function addTag(): void {
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
  catalogue.findOrCreateTag(name);
  newTagError.value = "";
  newTagName.value = "";
  announcement.value = `Added the tag ${name}.`;
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
      />
      <button type="submit" class="btn btnPrimary">Add Tag</button>
    </form>
    <p class="visuallyHidden" role="status">{{ announcement }}</p>

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

.addTag > :first-child {
  flex: 1 1 16rem;
}
</style>
