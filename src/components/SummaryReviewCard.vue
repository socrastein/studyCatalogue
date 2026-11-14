<!--
  One study's draft summary up for review: the study's citation, the draft beside the abstract it may have been written
  from (so Matt can check one against the other), where the draft came from, and the three things he can do with it:
  approve it, edit its words (then approve), or reject it, which deletes it. Rejecting asks first, since a draft that
  took a language model's effort cannot be got back; the page does that, so this card only says what was chosen.
-->
<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { formatApa } from "../catalogue/citations/apa";
import type { Study } from "../catalogue/study";
import { describeSummarySource } from "../catalogue/summary";
import TextField from "./TextField.vue";

const props = defineProps<{
  /** The study to review; it has a draft summary. */
  study: Study;
  /** Whether another draft waits to be shown instead: skipping the only one would change nothing. */
  canSkip: boolean;
}>();

const emit = defineEmits<{
  approve: [];
  /** Put this draft at the end of the queue for this visit. */
  skip: [];
  /** The edited words, not empty. */
  saveText: [text: string];
  reject: [];
}>();

const draft = computed(() => props.study.summary);

/** Where the draft came from, naming the PDF for a full-text draft so it can be opened and checked. */
const sourceText = computed(() =>
  draft.value === undefined ? "" : describeSummarySource(draft.value),
);
const citation = computed(() => formatApa(props.study).plainText);
const isEditing = ref(false);
const editedText = ref("");
const editProblem = ref("");
const titleElement = ref<HTMLElement | null>(null);

/** Opens the editor on the draft's words, and moves into it. */
async function startEditing(): Promise<void> {
  editedText.value = draft.value?.text ?? "";
  editProblem.value = "";
  isEditing.value = true;
  await nextTick();
  document.getElementById("review-summary-text")?.focus();
}

/** Leaves the editor without saving, and puts focus back on the button that opened it. */
async function cancelEditing(): Promise<void> {
  isEditing.value = false;
  await nextTick();
  document.getElementById("review-edit-button")?.focus();
}

/** Saves the edited words, unless they are empty (a summary with no words is a rejection, which has its own button). */
function saveEditing(): void {
  const text = editedText.value.trim();
  if (text === "") {
    editProblem.value = "Write a summary, or reject the draft instead.";
    return;
  }
  emit("saveText", text);
  isEditing.value = false;
}

defineExpose({
  /** Moves focus to the study's title, so a new card is announced after the last one was dealt with. */
  focusTitle: () => titleElement.value?.focus(),
});
</script>

<template>
  <article class="reviewCard panel" aria-labelledby="review-title">
    <h2 id="review-title" ref="titleElement" tabindex="-1" class="h6">
      {{ study.title }}
    </h2>
    <p class="citation textMuted">{{ citation }}</p>

    <div class="columns">
      <section aria-labelledby="draft-heading">
        <h3 id="draft-heading" class="partTitle">Draft Summary</h3>
        <p v-if="draft" class="textMuted">{{ sourceText }}</p>
        <p v-if="!isEditing" class="draftText">{{ draft?.text }}</p>
        <form v-else class="editor" @submit.prevent="saveEditing">
          <TextField
            id="review-summary-text"
            v-model="editedText"
            label="Summary"
            :error="editProblem"
            is-multiline
            :rows="8"
          />
          <div class="actions">
            <button type="submit" class="btn btnPrimary">Save Edit</button>
            <button
              type="button"
              class="btn btnSecondary"
              @click="cancelEditing"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
      <section aria-labelledby="abstract-heading">
        <h3 id="abstract-heading" class="partTitle">Abstract</h3>
        <p v-if="study.abstract !== ''">{{ study.abstract }}</p>
        <p v-else class="textMuted">This study has no abstract.</p>
      </section>
    </div>

    <div v-if="!isEditing" class="actions">
      <button type="button" class="btn btnPrimary" @click="emit('approve')">
        Approve
      </button>
      <button
        id="review-edit-button"
        type="button"
        class="btn btnSecondary"
        @click="startEditing"
      >
        Edit
      </button>
      <button
        v-if="canSkip"
        type="button"
        class="btn btnSecondary"
        @click="emit('skip')"
      >
        Skip
      </button>
      <button
        type="button"
        class="btn btnDangerSubtle rejectButton"
        @click="emit('reject')"
      >
        Reject
      </button>
    </div>
  </article>
</template>

<style scoped>
.reviewCard {
  display: flex;
  flex-direction: column;
  gap: var(--space2);
  padding: var(--space2) var(--space3) var(--space3);
}

/* Side by side where there is room: the draft is read against the abstract */
.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: var(--space3);
}

.columns section {
  display: flex;
  flex-direction: column;
  gap: var(--space1);
}

.draftText {
  white-space: pre-line;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: var(--space2);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space1);
}

/* At the far end, away from Approve */
.rejectButton {
  margin-left: auto;
}
</style>
