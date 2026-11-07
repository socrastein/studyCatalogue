<!--
  The study form, for adding and editing alike: publication details, abstract, topic tags, design and participants.
  It edits a draft (see studyDraft.ts) and checks it only on submit; a failed submit shows each message beside its
  field and in a summary at the top, which takes focus. A valid submit emits the study details for the page to save.
-->
<script setup lang="ts">
import { computed, nextTick, reactive, ref, toRaw } from "vue";
import {
  AGE_GROUPS,
  SEXES,
  STUDY_DESIGNS,
  SUBJECTS,
  TRAINING_STATUSES,
} from "../catalogue/facets";
import type { CrossrefFields } from "../catalogue/crossref";
import type { StudyDetails } from "../catalogue/study";
import {
  validateDraft,
  type DraftErrors,
  type StudyDraft,
} from "../catalogue/studyDraft";
import { useCatalogue } from "../stores/catalogueStore";
import AuthorListField from "./AuthorListField.vue";
import DoiField from "./DoiField.vue";
import ErrorSummary from "./ErrorSummary.vue";
import CheckboxGroup from "./CheckboxGroup.vue";
import RadioGroup from "./RadioGroup.vue";
import TagCombobox from "./TagCombobox.vue";
import TextField from "./TextField.vue";
import { errorSummaryItems } from "./studyFormErrors";

const props = defineProps<{
  initialDraft: StudyDraft;
  submitLabel: string;
}>();

const emit = defineEmits<{ save: [details: StudyDetails] }>();

const catalogue = useCatalogue();
// A copy, so typing never changes the object the page passed in
const draft = reactive<StudyDraft>(structuredClone(toRaw(props.initialDraft)));
const errors = ref<DraftErrors>({});
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null);

const summaryItems = computed(() => errorSummaryItems(errors.value));

/** Checks the draft: emits the details when valid, otherwise shows the messages and focuses the summary. */
async function submit(): Promise<void> {
  const result = validateDraft(draft);
  if (result.kind === "valid") {
    errors.value = {};
    emit("save", result.details);
    return;
  }
  errors.value = result.errors;
  await nextTick();
  summary.value?.focus();
}

/** Puts the details found for the DOI into the form, replacing what was there: the person asked for the lookup. */
function fillFromLookup(fields: CrossrefFields): void {
  Object.assign(draft, fields);
}

/** Creates a tag typed in the tag box (or finds one by that name) and adds it to the study. */
function createTag(name: string): void {
  const tag = catalogue.findOrCreateTag(name);
  if (!draft.tagIds.includes(tag.id)) draft.tagIds.push(tag.id);
}
</script>

<template>
  <form class="studyForm" novalidate @submit.prevent="submit">
    <ErrorSummary
      v-if="summaryItems.length > 0"
      ref="summary"
      :items="summaryItems"
    />

    <section class="formSection" aria-labelledby="publication-heading">
      <h2 id="publication-heading">Publication</h2>
      <!-- First, because filling it in can fill in everything else in this section -->
      <DoiField
        v-model="draft.doi"
        :error="errors.doi"
        @found="fillFromLookup"
      />
      <TextField
        id="study-title"
        v-model="draft.title"
        label="Title"
        :error="errors.title"
        is-multiline
        :rows="2"
      />
      <AuthorListField v-model="draft.authors" :error="errors.authors" />
      <div class="fieldRow">
        <TextField
          id="study-year"
          v-model="draft.year"
          class="shortField"
          label="Year"
          inputmode="numeric"
          :error="errors.year"
        />
        <TextField
          id="study-journal"
          v-model="draft.journal"
          class="growField"
          label="Journal"
          :error="errors.journal"
        />
      </div>
      <div class="fieldRow">
        <TextField
          id="study-volume"
          v-model="draft.volume"
          class="shortField"
          label="Volume"
          is-optional
        />
        <TextField
          id="study-issue"
          v-model="draft.issue"
          class="shortField"
          label="Issue"
          is-optional
        />
        <TextField
          id="study-pages"
          v-model="draft.pages"
          class="shortField"
          label="Pages"
          hint="e.g. 1073-1082"
          is-optional
        />
      </div>
      <TextField
        id="study-url"
        v-model="draft.url"
        label="Link"
        hint="For a study without a DOI, or a free full-text copy"
        type="url"
        inputmode="url"
        :error="errors.url"
        is-optional
      />
    </section>

    <section class="formSection" aria-labelledby="abstract-heading">
      <h2 id="abstract-heading">Abstract</h2>
      <TextField
        id="study-abstract"
        v-model="draft.abstract"
        label="Abstract"
        is-multiline
        :rows="8"
        is-optional
      />
    </section>

    <section class="formSection" aria-labelledby="topics-heading">
      <h2 id="topics-heading">Topics</h2>
      <TagCombobox
        id="study-tags"
        v-model="draft.tagIds"
        label="Tags"
        hint="Type to find a tag, or to create a new one."
        :tags="catalogue.state.catalogue.tags"
        allow-create
        @create="createTag"
      />
    </section>

    <section class="formSection" aria-labelledby="design-heading">
      <h2 id="design-heading">Design</h2>
      <RadioGroup
        id="study-design"
        v-model="draft.design"
        legend="Study design"
        :values="STUDY_DESIGNS"
        :error="errors.design"
      />
      <RadioGroup
        id="study-subjects"
        v-model="draft.subjects"
        legend="Subjects"
        :values="SUBJECTS"
        :error="errors.subjects"
      />
    </section>

    <section class="formSection" aria-labelledby="participants-heading">
      <h2 id="participants-heading">Participants</h2>
      <p class="fieldHint">
        Check every group the study included. Leave a question unchecked if the
        study does not report it.
      </p>
      <CheckboxGroup
        id="study-age-groups"
        v-model="draft.ageGroups"
        legend="Age group"
        :values="AGE_GROUPS"
      />
      <CheckboxGroup
        id="study-training-statuses"
        v-model="draft.trainingStatuses"
        legend="Training status"
        :values="TRAINING_STATUSES"
      />
      <CheckboxGroup
        id="study-sexes"
        v-model="draft.sexes"
        legend="Sex"
        :values="SEXES"
      />
    </section>

    <div class="formActions">
      <button type="submit" class="submitButton">{{ submitLabel }}</button>
      <RouterLink to="/">Cancel</RouterLink>
      <slot name="extraActions"></slot>
    </div>
  </form>
</template>

<style scoped>
.studyForm {
  width: min(100%, 44rem);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.formSection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--secondary-background);
  border-radius: 0.5rem;
}

h2 {
  font-size: 1.25rem;
}

.fieldRow {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.shortField {
  flex: 0 1 9rem;
}

.growField {
  flex: 1 1 16rem;
}

.formActions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem;
}

.submitButton {
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
}
</style>
