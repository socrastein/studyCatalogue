<!--
  The home page: every saved study, newest first, each linking to its edit page. Search, filters and citations come
  with the full browse view; for now this is the plain list.
-->
<script setup lang="ts">
import { computed } from "vue";
import { shortAuthorMention } from "../catalogue/citations/authorNames";
import { useCatalogue } from "../stores/catalogueStore";

const catalogue = useCatalogue();

const studiesNewestFirst = computed(() =>
  [...catalogue.state.catalogue.studies].reverse(),
);
</script>

<template>
  <h1 tabindex="-1">Studies</h1>
  <p v-if="studiesNewestFirst.length === 0">
    No studies yet. <RouterLink to="/studies/new">Add a study</RouterLink>
  </p>
  <ul v-else class="studyList">
    <li v-for="study in studiesNewestFirst" :key="study.id">
      <RouterLink :to="`/studies/${study.id}/edit`">{{
        study.title
      }}</RouterLink>
      <span class="byline">
        {{ shortAuthorMention(study.authors) }} ({{ study.year }})
      </span>
    </li>
  </ul>
</template>

<style scoped>
.studyList {
  width: min(100%, 44rem);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-left: 1.25rem;
}

.byline {
  display: block;
  color: var(--secondary-color);
}
</style>
