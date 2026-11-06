<!--
  The home page: find studies by search, topic and facets, and copy their citations. The filters live in the URL
  (see filtersInUrl.ts), so a search survives a trip to an edit page and can be bookmarked. Results are sorted by
  publication year, newest first, and the count is announced as filters change.

  On wide screens the filters sit beside the results; on narrow ones they fold into a "Filters" disclosure, open
  when filters are set so the person can see why the list is short.
-->
<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  emptyFilters,
  filterStudies,
  hasActiveFilters,
  type PopulationFacet,
  type StudyFilters,
} from "../catalogue/filterStudies";
import type { Study } from "../catalogue/study";
import FilterPanel from "../components/FilterPanel.vue";
import StudyCard from "../components/StudyCard.vue";
import { useCatalogue } from "../stores/catalogueStore";
import { filtersFromQuery, queryFromFilters } from "./filtersInUrl";

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
  // replace, not push: each keystroke in the search box would otherwise become a Back step
  set: (newFilters) =>
    void router.replace({ query: queryFromFilters(newFilters) }),
});

const result = computed(() =>
  filterStudies(allStudies.value, tags.value, filters.value),
);
const sortedMatches = computed(() =>
  [...result.value.matches].sort(newestFirst),
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

/** Publication year, newest first; studies from the same year by title. */
function newestFirst(first: Study, second: Study): number {
  return second.year - first.year || first.title.localeCompare(second.title);
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
  <h1 tabindex="-1">Studies</h1>

  <p v-if="allStudies.length === 0" class="emptyCatalogue">
    No studies yet. <RouterLink to="/studies/new">Add a study</RouterLink>
  </p>

  <div v-else class="browseLayout">
    <details
      class="filters"
      :open="isFilterPanelOpen"
      @toggle="onFilterPanelToggle"
    >
      <summary><h2>Filters</h2></summary>
      <FilterPanel v-model="filters" :tags="tags" />
    </details>

    <section class="results" aria-labelledby="results-heading">
      <h2 id="results-heading" class="visuallyHidden">Results</h2>
      <p class="resultCount" role="status">{{ countText }}</p>
      <p v-for="note in unreportedNotes" :key="note" class="fieldHint">
        {{ note }}
      </p>
      <p v-if="sortedMatches.length === 0" class="noMatches">
        No studies match these filters.
        <button type="button" class="secondaryButton" @click="clearFilters">
          Clear all filters
        </button>
      </p>
      <ol class="studyList">
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
  gap: 1.5rem;
  align-items: start;
}

@media (min-width: 60rem) {
  .browseLayout {
    grid-template-columns: 18rem 1fr;
  }
}

.filters {
  padding: 1rem 1.25rem;
  background: var(--secondary-background);
  border-radius: 0.5rem;
}

.filters summary {
  cursor: pointer;
}

/* The heading sits inside the summary so the disclosure triangle and the heading line up */
.filters summary h2 {
  display: inline;
  font-size: 1.2rem;
}

.filters[open] summary {
  margin-bottom: 1rem;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.resultCount {
  font-weight: bold;
}

.noMatches {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.noMatches button {
  padding: 0.4rem 0.9rem;
}

.studyList {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0;
  list-style: none;
}
</style>
