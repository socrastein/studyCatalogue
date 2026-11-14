<!--
  The browse filters: a search box, topic tags, and a checkbox group per facet, plus a button to clear them all. It
  edits a whole StudyFilters object through v-model, so the page decides where filters live (the URL).
-->
<script setup lang="ts">
import FormField from "lifting-school-ui/components/FormField.vue";
import { computed } from "vue";
import {
  AGE_GROUPS,
  SEXES,
  STUDY_DESIGNS,
  SUBJECTS,
  TRAINING_STATUSES,
} from "../catalogue/facets";
import {
  emptyFilters,
  hasActiveFilters,
  type StudyFilters,
} from "../catalogue/filterStudies";
import type { Tag } from "../catalogue/tags";
import CheckboxGroup from "./CheckboxGroup.vue";
import TagPicker from "./TagPicker.vue";

defineProps<{ tags: readonly Tag[] }>();

const filters = defineModel<StudyFilters>({ required: true });

/** The filters that are lists of chosen values: everything but the search text. */
type ListFilter = Exclude<keyof StudyFilters, "query">;

/**
 * A two-way binding to one list filter, for a child's v-model: reading gives a copy of that filter's values, writing
 * replaces them in a new filters object (the model is always replaced whole, never changed in place).
 *
 * The children deal in plain strings; the values they offer come from the same facet vocabularies, so writing them
 * back as the facet's id type is safe.
 */
function listFilter(key: ListFilter) {
  return computed<string[]>({
    get: () => [...filters.value[key]],
    set: (values) => {
      filters.value = { ...filters.value, [key]: values };
    },
  });
}

const query = computed({
  get: () => filters.value.query,
  set: (text: string) => {
    filters.value = { ...filters.value, query: text };
  },
});
const tagIds = listFilter("tagIds");
const designs = listFilter("designs");
const subjects = listFilter("subjects");
const ageGroups = listFilter("ageGroups");
const trainingStatuses = listFilter("trainingStatuses");
const sexes = listFilter("sexes");

const isFiltered = computed(() => hasActiveFilters(filters.value));

function clearFilters(): void {
  filters.value = emptyFilters();
}
</script>

<template>
  <div class="filterPanel">
    <FormField
      id="browse-search"
      v-slot="field"
      label="Search"
      hint="Title, authors, year, journal, abstract or topic"
    >
      <input
        v-bind="field"
        v-model="query"
        class="input searchInput"
        type="search"
        autocomplete="off"
      />
    </FormField>
    <TagPicker
      id="browse-tags"
      v-model="tagIds"
      label="Topics"
      hint="Includes everything filed under a topic."
      :tags="tags"
      :allow-create="false"
    />
    <CheckboxGroup
      id="filter-design"
      v-model="designs"
      legend="Study Design"
      :values="STUDY_DESIGNS"
    />
    <CheckboxGroup
      id="filter-subjects"
      v-model="subjects"
      legend="Subjects"
      :values="SUBJECTS"
    />
    <CheckboxGroup
      id="filter-age"
      v-model="ageGroups"
      legend="Age Group"
      :values="AGE_GROUPS"
    />
    <CheckboxGroup
      id="filter-training"
      v-model="trainingStatuses"
      legend="Training Status"
      :values="TRAINING_STATUSES"
    />
    <CheckboxGroup
      id="filter-sex"
      v-model="sexes"
      legend="Sex"
      :values="SEXES"
    />
    <button
      v-if="isFiltered"
      type="button"
      class="btn btnSubtle"
      @click="clearFilters"
    >
      Clear All Filters
    </button>
  </div>
</template>

<style scoped>
.filterPanel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space2);
}

.searchInput {
  width: 100%;
}

/* One option per line: the panel is narrow */
:deep(.options) {
  grid-template-columns: 1fr;
}

button {
  align-self: flex-start;
}
</style>
