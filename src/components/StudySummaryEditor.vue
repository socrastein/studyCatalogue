<!--
  The "Summary" section of the Edit Study page: the study's summary as words to correct, its source and status, and what
  can be done with it: save the words (an approved summary stays approved, a draft stays a draft), send an approved one
  back to the review queue, or remove it. Sending back and removing are chosen here and carried out by the page, which
  asks before removing. A study with no summary says so and offers nothing: summaries are written outside the app.
-->
<script setup lang="ts">
import { computed, ref } from "vue";
import type { Study } from "../catalogue/study";
import {
  approvalDateText,
  describeSummarySource,
  summaryStatusText,
} from "../catalogue/summary";
import TextField from "./TextField.vue";

const props = defineProps<{
  /** The study whose summary is shown. */
  study: Study;
}>();

const emit = defineEmits<{
  /** The edited words, not empty. */
  save: [text: string];
  sendBack: [];
  remove: [];
}>();

const summary = computed(() => props.study.summary);

/** "Draft", or "Approved on Nov 10, 2026". */
const statusText = computed(() => {
  const current = summary.value;
  if (current === undefined) return "";
  if (current.approvedAt === null) return summaryStatusText(current);
  return `${summaryStatusText(current)} on ${approvalDateText(current.approvedAt)}`;
});

// What is typed; saved only by Save Summary. Starts from the saved words, and is not reset when the study is saved.
const editedText = ref(props.study.summary?.text ?? "");
const problem = ref("");

/** Saves the words, unless they are empty (a summary with no words is a removal, which has its own button). */
function saveText(): void {
  const text = editedText.value.trim();
  if (text === "") {
    problem.value = "Write a summary, or remove it instead.";
    return;
  }
  problem.value = "";
  emit("save", text);
}
</script>

<template>
  <section
    id="study-summary"
    class="summarySection panel"
    aria-labelledby="summary-heading"
  >
    <h2 id="summary-heading" class="sectionTitle">Summary</h2>
    <p v-if="!summary" class="textMuted">This study has no summary.</p>
    <template v-else>
      <p class="status">
        <span class="textMuted">Status:</span> {{ statusText }}
      </p>
      <p class="textMuted">{{ describeSummarySource(summary) }}</p>
      <form class="editor" @submit.prevent="saveText">
        <TextField
          id="study-summary-text"
          v-model="editedText"
          label="Summary Text"
          is-multiline
          :rows="6"
          :error="problem"
        />
        <div class="actions">
          <button type="submit" class="btn btnPrimary">Save Summary</button>
          <button
            v-if="summary.approvedAt !== null"
            type="button"
            class="btn btnSecondary"
            @click="emit('sendBack')"
          >
            Send Back to Review
          </button>
          <button
            type="button"
            class="btn btnDangerSubtle removeButton"
            @click="emit('remove')"
          >
            Remove Summary
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

<style scoped>
.summarySection {
  width: min(100%, 44rem);
  display: flex;
  flex-direction: column;
  gap: var(--space2);
  padding: var(--space2) var(--space3) var(--space3);
}

/* The section's gap already spaces the title from what follows */
.sectionTitle {
  margin-bottom: 0;
}

.status {
  font-weight: 700;
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

/* At the far end, away from Save Summary */
.removeButton {
  margin-left: auto;
}
</style>
