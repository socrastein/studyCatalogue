<!--
  One study in the list: title, authors and year, journal, its design, participants and topics, the abstract on
  request, and its actions: copy a citation (APA, MLA or a Reddit link), open the paper, edit. Topic tags link to the
  list filtered by that tag.
-->
<script setup lang="ts">
import { computed } from "vue";
import { formatApa } from "../catalogue/citations/apa";
import { shortAuthorMention } from "../catalogue/citations/authorNames";
import { studyLink, type Citation } from "../catalogue/citations/citation";
import { formatMla } from "../catalogue/citations/mla";
import { formatRedditLink } from "../catalogue/citations/redditLink";
import {
  AGE_GROUPS,
  facetLabel,
  SEXES,
  STUDY_DESIGNS,
  SUBJECTS,
  TRAINING_STATUSES,
  type FacetValue,
} from "../catalogue/facets";
import type { Study } from "../catalogue/study";
import type { Tag } from "../catalogue/tags";
import { copyCitation } from "./copyCitation";

const props = defineProps<{
  study: Study;
  /** Every tag in the catalogue, to name the study's tags. */
  tags: readonly Tag[];
}>();

const emit = defineEmits<{
  /** A citation was copied, or could not be; the message says which, for the page to announce. */
  copied: [message: string];
}>();

const CITATION_FORMATS = [
  { label: "APA", format: formatApa },
  { label: "MLA", format: formatMla },
  { label: "Reddit link", format: formatRedditLink },
] as const;

const headingId = computed(() => `study-${props.study.id}-title`);
const paperLink = computed(() => studyLink(props.study));
const studyTags = computed(() =>
  props.tags.filter((tag) => props.study.tagIds.includes(tag.id)),
);

/** The labels of a population facet's values, or "Not reported" when the study gives none. */
function populationText(
  values: readonly FacetValue[],
  ids: readonly string[],
): string {
  if (ids.length === 0) return "Not reported";
  return ids.map((id) => facetLabel(values, id)).join(", ");
}

/** Copies the study's citation in one format and reports the outcome. */
async function copy(
  label: string,
  format: (study: Study) => Citation,
): Promise<void> {
  const wasCopied = await copyCitation(format(props.study));
  emit(
    "copied",
    wasCopied
      ? `Copied the ${label} citation.`
      : `Could not copy the ${label} citation.`,
  );
}
</script>

<template>
  <article class="studyCard card" :aria-labelledby="headingId">
    <h2 :id="headingId" class="h6">{{ study.title }}</h2>
    <p class="byline textMuted">
      {{ shortAuthorMention(study.authors) }} ({{ study.year }}).
      <i>{{ study.journal }}</i>
    </p>

    <dl class="facts">
      <dt>Design</dt>
      <dd>
        {{ facetLabel(STUDY_DESIGNS, study.design) }},
        {{ facetLabel(SUBJECTS, study.subjects).toLowerCase() }}
      </dd>
      <dt>Age</dt>
      <dd>{{ populationText(AGE_GROUPS, study.ageGroups) }}</dd>
      <dt>Training</dt>
      <dd>{{ populationText(TRAINING_STATUSES, study.trainingStatuses) }}</dd>
      <dt>Sex</dt>
      <dd>{{ populationText(SEXES, study.sexes) }}</dd>
      <template v-if="studyTags.length > 0">
        <dt>Topics</dt>
        <dd>
          <ul class="tagLinks plainList">
            <li v-for="tag in studyTags" :key="tag.id">
              <RouterLink :to="{ path: '/', query: { tag: tag.id } }">
                {{ tag.name }}
              </RouterLink>
            </li>
          </ul>
        </dd>
      </template>
    </dl>

    <details v-if="study.abstract !== ''" class="abstract">
      <summary>Abstract</summary>
      <p>{{ study.abstract }}</p>
    </details>

    <div class="actions">
      <div
        class="copyButtons"
        role="group"
        :aria-label="`Copy citation for ${study.title}`"
      >
        <span aria-hidden="true" class="copyLabel">Copy:</span>
        <button
          v-for="citation in CITATION_FORMATS"
          :key="citation.label"
          type="button"
          class="btn btnSecondary btnSm"
          @click="copy(citation.label, citation.format)"
        >
          {{ citation.label }}
        </button>
      </div>
      <a
        v-if="paperLink"
        :href="paperLink"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open paper<span class="visuallyHidden"> (opens in a new tab)</span>
      </a>
      <RouterLink :to="`/studies/${study.id}/edit`">
        Edit<span class="visuallyHidden"> {{ study.title }}</span>
      </RouterLink>
    </div>
  </article>
</template>

<style scoped>
.studyCard {
  display: flex;
  flex-direction: column;
  gap: var(--space2);
  padding: var(--space2) var(--space3);
}

.studyCard h2 {
  font-weight: 700;
}

.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--spaceHalf) var(--space2);
}

dt {
  font-weight: 700;
}

.tagLinks {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spaceHalf) var(--space2);
}

.abstract summary {
  cursor: pointer;
  font-weight: 700;
  /* Tall enough for the 24px minimum target size (WCAG 2.5.8) */
  padding: var(--spaceHalf) 0;
}

.abstract p {
  margin-top: var(--space1);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space1) var(--space3);
}

.copyButtons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space1);
}

.copyLabel {
  font-weight: 700;
}
</style>
