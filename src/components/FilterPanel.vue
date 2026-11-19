<!--
  The browse filters, as one compact card in the shape of the website's Study Catalog. The top line says how many studies
  are shown (announced politely as it changes), with "Clear Filters" at its end while anything is set. Under it sits the
  search box, its magnifying glass inside the box and no visible label. Everything else (topics, the facets and the sort)
  folds away under "More Options", which says how many of its options are set while it is closed.

  It edits a whole StudyFilters object and the sort order through v-model, so the page decides where they live (the URL).
-->
<script setup lang="ts">
import DisclosureSection from "lifting-school-ui/components/DisclosureSection.vue";
import DropdownSelect from "lifting-school-ui/components/DropdownSelect.vue";
import FormField from "lifting-school-ui/components/FormField.vue";
import type { DropdownOption } from "lifting-school-ui/dropdownOption";
import searchIcon from "lifting-school-ui/icons/search.svg";
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
import { DEFAULT_SORT_ORDER, type SortOrder } from "../catalogue/sortStudies";
import type { Tag } from "../catalogue/tags";
import CheckboxGroup from "./CheckboxGroup.vue";
import TagPicker from "./TagPicker.vue";

const props = defineProps<{
  tags: readonly Tag[];
  /** The sort orders the drop-down offers, each with its label. */
  sortOptions: DropdownOption<SortOrder>[];
  /** For example "Showing 12 of 298 studies". */
  countLine: string;
}>();

const filters = defineModel<StudyFilters>({ required: true });
const sortOrder = defineModel<SortOrder>("sort", { required: true });

/** The filters that are lists of chosen values: everything but the search text. */
type ListFilter = Exclude<keyof StudyFilters, "query">;

/** Every list filter. Each one that holds a value counts as one active option under More Options. */
const LIST_FILTERS: readonly ListFilter[] = [
  "tagIds",
  "designs",
  "subjects",
  "ageGroups",
  "trainingStatuses",
  "sexes",
];

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

/**
 * How many options under More Options are set: each list filter that holds a value counts once (three topics are one
 * option), and the sort counts when it is not the default. The sort is not a filter, but it changes what the list
 * looks like, so a closed fold-out should say it has been changed.
 */
const activeOptionCount = computed(() => {
  const listsInUse = LIST_FILTERS.filter(
    (key) => filters.value[key].length > 0,
  ).length;
  const isSortChanged = sortOrder.value !== DEFAULT_SORT_ORDER;
  return listsInUse + (isSortChanged ? 1 : 0);
});

/** "More Options", or "More Options (2 active)" while some of what it holds is set. */
const optionsTitle = computed(() => {
  const count = activeOptionCount.value;
  return count === 0 ? "More Options" : `More Options (${count} active)`;
});

/**
 * The magnifying glass as a mask, so the library's icon takes the text colour in both themes. The address is quoted
 * because the icon's inlined address holds quote marks of its own, which would end an unquoted url(...).
 */
const searchIconStyle = { maskImage: `url("${searchIcon}")` };

/**
 * Empties every filter, the search text included, so the list shows every study again. The sort is kept: it is how
 * the results are shown, not which results are shown.
 */
function clearFilters(): void {
  filters.value = emptyFilters();
}
</script>

<template>
  <section class="card filterCard" aria-labelledby="browseFiltersHeading">
    <!-- The card's name for the outline and for screen readers. Not drawn: the count line takes the top of the card. -->
    <h2 id="browseFiltersHeading" class="visuallyHidden">Find Studies</h2>

    <!-- The one element that stays put as filters change, so its polite announcements keep working -->
    <div class="statusRow">
      <p class="fieldNote" aria-live="polite">{{ props.countLine }}</p>
      <button
        v-if="isFiltered"
        type="button"
        class="btn btnSecondary btnSm"
        @click="clearFilters"
      >
        Clear Filters
      </button>
    </div>

    <FormField id="browse-search" v-slot="field" label="Search" hide-label>
      <div class="searchBox">
        <!-- Decorative: the field's own (hidden) label names the box -->
        <span class="searchIcon" aria-hidden="true" :style="searchIconStyle" />
        <input
          v-bind="field"
          v-model="query"
          class="input searchInput"
          type="search"
          placeholder="Search"
          autocomplete="off"
        />
      </div>
    </FormField>

    <DisclosureSection :title="optionsTitle">
      <div class="optionList">
        <TagPicker
          id="browse-tags"
          v-model="tagIds"
          label="Topics"
          hint="Includes everything filed under a topic."
          :tags="props.tags"
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
        <FormField id="browse-sort" v-slot="field" label="Sort By" is-combobox>
          <!-- Named by aria-label, not aria-labelledby: a named getByRole on aria-labelledby crashes Firefox under axe (microsoft/playwright#43967). Drop the two lines when Playwright ships a fixed Firefox. -->
          <DropdownSelect
            v-bind="field"
            :labelled-by="undefined"
            label="Sort By"
            :combo-id="field.id"
            :options="props.sortOptions"
            :value="sortOrder"
            size="regular"
            @change="(order) => (sortOrder = order)"
          />
        </FormField>
      </div>
    </DisclosureSection>
  </section>
</template>

<style scoped>
.filterCard {
  display: flex;
  flex-direction: column;
  gap: var(--spaceHalf);
  padding: var(--space2);
}

/* The count line and the button share a row; the button drops under the count on a narrow card */
.statusRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space1);
  margin-bottom: var(--spaceHalf);
}

.statusRow p {
  margin: 0;
  width: auto;
}

/* The magnifying glass sits inside the box's start edge; the text starts after it, so it never runs under the icon */
.searchBox {
  position: relative;
}

.searchIcon {
  position: absolute;
  inset-inline-start: var(--space1);
  top: 50%;
  width: var(--space2);
  height: var(--space2);
  transform: translateY(-50%);
  background-color: var(--textMuted);
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  pointer-events: none;
}

.searchInput {
  width: 100%;
  padding-inline-start: calc(var(--space1) + var(--space2) + var(--space1));
}

/* The fold-out's options, one under another: the card is narrow */
.optionList {
  display: flex;
  flex-direction: column;
  gap: var(--space2);
  padding-top: var(--space1);
}

.optionList :deep(.options) {
  grid-template-columns: 1fr;
}
</style>
