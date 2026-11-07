<!--
  The home page: find studies by search, topic and facets, and copy their citations. The filters live in the URL
  (see browseInUrl.ts) with the chosen sort order, so a search survives a trip to an edit page and can be bookmarked.
  Results start newest published first, and the count is announced as filters change.

  On wide screens the filters sit beside the results; on narrow ones they fold into a "Filters" disclosure, open
  when filters are set so the person can see why the list is short.
-->
<script setup lang="ts">
import FormField from "lifting-school-ui/components/FormField.vue";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  emptyFilters,
  filterStudies,
  hasActiveFilters,
  type PopulationFacet,
  type StudyFilters,
} from "../catalogue/filterStudies";
import {
  SORT_ORDERS,
  sortStudies,
  type SortOrder,
} from "../catalogue/sortStudies";
import FilterPanel from "../components/FilterPanel.vue";
import StudyCard from "../components/StudyCard.vue";
import { useCatalogue } from "../stores/catalogueStore";
import {
  browseQuery,
  filtersFromQuery,
  sortOrderFromQuery,
} from "./browseInUrl";

/** Wide enough for the filters to sit beside the results rather than above them; matches the layout's breakpoint. */
const WIDE_LAYOUT_QUERY = "(min-width: 60rem)";

/** How each population facet is named in the "don't report" note. */
const FACET_NAMES: Record<PopulationFacet, string> = {
  ageGroups: "age group",
  trainingStatuses: "training status",
  sexes: "sex",
};

const catalogue = useCatalogue();
const route = useRoute();
const router = useRouter();
const copyAnnouncement = ref("");

const tags = computed(() => catalogue.state.catalogue.tags);
const allStudies = computed(() => catalogue.state.catalogue.studies);

const filters = computed<StudyFilters>({
  get: () => filtersFromQuery(route.query),
  set: (newFilters) => showInUrl(newFilters, sortOrder.value),
});
const sortOrder = computed<SortOrder>({
  get: () => sortOrderFromQuery(route.query),
  set: (newOrder) => showInUrl(filters.value, newOrder),
});

const result = computed(() =>
  filterStudies(allStudies.value, tags.value, filters.value),
);
const sortedMatches = computed(() =>
  sortStudies(result.value.matches, sortOrder.value),
);

const isFilterPanelOpen = ref(
  window.matchMedia(WIDE_LAYOUT_QUERY).matches ||
    hasActiveFilters(filters.value),
);

/** "4 studies" unfiltered; "1 of 4 studies match" when filtered. */
const countText = computed(() => {
  const total = studyCount(allStudies.value.length);
  if (!hasActiveFilters(filters.value)) return total;
  return `${sortedMatches.value.length} of ${total} match`;
});

/** One line per filtered population facet that left studies out for not reporting it. */
const unreportedNotes = computed(() => {
  const counts = Object.entries(result.value.unreportedCounts) as [
    PopulationFacet,
    number,
  ][];
  return counts
    .filter(([, count]) => count > 0)
    .map(([facet, count]) => unreportedNote(facet, count));
});

/** e.g. "2 more studies match but do not report training status." */
function unreportedNote(facet: PopulationFacet, count: number): string {
  const verbs = count === 1 ? "study matches but does" : "studies match but do";
  return `${count} more ${verbs} not report ${FACET_NAMES[facet]}.`;
}

/** e.g. "1 study", "12 studies". */
function studyCount(count: number): string {
  return `${count} ${count === 1 ? "study" : "studies"}`;
}

/**
 * Puts the filters and sort order in the URL, which the page reads them back from. Replaces the history entry
 * rather than adding one: each keystroke in the search box would otherwise become a Back step.
 */
function showInUrl(newFilters: StudyFilters, newOrder: SortOrder): void {
  void router.replace({ query: browseQuery(newFilters, newOrder) });
}

function clearFilters(): void {
  filters.value = emptyFilters();
}

/** Records the panel being opened or closed by the person, so it stays as they left it. */
function onFilterPanelToggle(event: Event): void {
  isFilterPanelOpen.value = (event.target as HTMLDetailsElement).open;
}
</script>

<template>
  <h1 tabindex="-1" class="pageTitle h3">Studies</h1>

  <p v-if="allStudies.length === 0" class="center">
    No studies yet. <RouterLink to="/studies/new">Add a study</RouterLink>
  </p>

  <div v-else class="browseLayout">
    <details
      class="filters panel"
      :open="isFilterPanelOpen"
      @toggle="onFilterPanelToggle"
    >
      <summary><h2 class="h6">Filters</h2></summary>
      <FilterPanel v-model="filters" :tags="tags" />
    </details>

    <section class="results" aria-labelledby="results-heading">
      <h2 id="results-heading" class="visuallyHidden">Results</h2>
      <div class="resultsBar">
        <p class="resultCount" role="status">{{ countText }}</p>
        <FormField id="browse-sort" v-slot="field" label="Sort by">
          <select v-bind="field" v-model="sortOrder" class="input">
            <option
              v-for="order in SORT_ORDERS"
              :key="order.id"
              :value="order.id"
            >
              {{ order.label }}
            </option>
          </select>
        </FormField>
      </div>
      <p v-for="note in unreportedNotes" :key="note" class="textMuted">
        {{ note }}
      </p>
      <p v-if="sortedMatches.length === 0" class="noMatches">
        No studies match these filters.
        <button type="button" class="btn btnSubtle" @click="clearFilters">
          Clear all filters
        </button>
      </p>
      <ol class="studyList plainList">
        <li v-for="study in sortedMatches" :key="study.id">
          <StudyCard
            :study="study"
            :tags="tags"
            @copied="(message) => (copyAnnouncement = message)"
          />
        </li>
      </ol>
      <p class="visuallyHidden" role="status">{{ copyAnnouncement }}</p>
    </section>
  </div>
</template>

<style scoped>
.browseLayout {
  width: min(100%, 72rem);
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space3);
  align-items: start;
}

@media (min-width: 60rem) {
  .browseLayout {
    grid-template-columns: 18rem 1fr;
  }
}

.filters {
  padding: var(--space2);
}

.filters summary {
  cursor: pointer;
}

/* The heading sits inside the summary so the disclosure triangle and the heading line up */
.filters summary h2 {
  display: inline;
}

.filters[open] summary {
  margin-bottom: var(--space2);
}

.results {
  display: flex;
  flex-direction: column;
  gap: var(--space1);
}

/* The count and the sort order on one line, wrapping on a narrow screen */
.resultsBar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space1) var(--space2);
}

.resultCount {
  width: auto;
  font-weight: 700;
}

.noMatches {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space1) var(--space2);
}

.studyList {
  display: flex;
  flex-direction: column;
  gap: var(--space2);
}
</style>
