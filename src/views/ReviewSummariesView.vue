<!--
  Review Summaries: the draft summaries waiting for Matt, one study at a time, so each is read against its abstract and
  citation. Approving, editing and rejecting happen on the card (SummaryReviewCard); this page keeps the queue and the
  count, asks before a draft is deleted, and says what happened in the page's status region. The link to it is in the
  navigation only while drafts wait, but the address always works and then says there is nothing to review.
-->
<script setup lang="ts">
import ConfirmDialog from "lifting-school-ui/components/ConfirmDialog.vue";
import { computed, nextTick, ref } from "vue";
import SummaryReviewCard from "../components/SummaryReviewCard.vue";
import { useConfirmation } from "../components/useConfirmation";
import { useCatalogue } from "../stores/catalogueStore";
import { showNoticeNow } from "../stores/notice";
import { useSummariesAwaitingReview } from "../stores/summaryReview";

const catalogue = useCatalogue();
const awaitingReview = useSummariesAwaitingReview();
const { question: pendingQuestion, ask: confirm, answer } = useConfirmation();
const card = ref<InstanceType<typeof SummaryReviewCard> | null>(null);

/** The study being reviewed: the first with a draft; the one after it is shown once this one is dealt with. */
const current = computed(() => awaitingReview.value[0]);

/** e.g. "3 summaries left to review", "1 summary left to review". */
function remainingText(count: number): string {
  return `${count} ${count === 1 ? "summary" : "summaries"} left to review`;
}

/** Says what was done and how many remain, then moves focus to the next study (or the page heading when done). */
async function reportAndMoveOn(done: string): Promise<void> {
  const remaining = awaitingReview.value.length;
  const tail = remaining === 0 ? "None left." : `${remainingText(remaining)}.`;
  showNoticeNow(`${done} ${tail}`);
  await nextTick();
  if (remaining > 0) card.value?.focusTitle();
  else document.querySelector<HTMLElement>("main h1")?.focus();
}

async function approve(): Promise<void> {
  const study = current.value;
  if (study === undefined) return;
  catalogue.approveSummary(study.id);
  await reportAndMoveOn(`Approved the summary of "${study.title}".`);
}

/** Saves the edited words; the draft stays up for review (and approval) afterwards. */
function saveText(text: string): void {
  const study = current.value;
  if (study === undefined) return;
  catalogue.editSummary(study.id, text);
  showNoticeNow(`Saved your changes to the summary of "${study.title}".`);
}

/** Asks first, then deletes the draft. */
async function reject(): Promise<void> {
  const study = current.value;
  if (study === undefined) return;
  const isConfirmed = await confirm({
    question: "Reject this draft?",
    detail: `The draft summary of "${study.title}" will be deleted. The study and its abstract are not affected.`,
    confirmLabel: "Reject Draft",
  });
  if (!isConfirmed) return;
  catalogue.rejectSummary(study.id);
  await reportAndMoveOn(`Rejected the draft summary of "${study.title}".`);
}
</script>

<template>
  <h1 tabindex="-1" class="pageTitle h3">Review Summaries</h1>
  <div class="reviewPage">
    <template v-if="current">
      <p class="remaining">{{ remainingText(awaitingReview.length) }}</p>
      <SummaryReviewCard
        :key="current.id"
        ref="card"
        :study="current"
        @approve="approve"
        @save-text="saveText"
        @reject="reject"
      />
    </template>
    <p v-else class="panel emptyPanel">
      No summaries are waiting for review.
      <RouterLink to="/">Back to the study list</RouterLink>
    </p>
  </div>
  <ConfirmDialog
    v-if="pendingQuestion"
    v-bind="pendingQuestion"
    @confirm="answer(true)"
    @cancel="answer(false)"
  />
</template>

<style scoped>
.reviewPage {
  width: min(100%, 60rem);
  display: flex;
  flex-direction: column;
  gap: var(--space2);
}

.remaining {
  font-weight: 600;
}

.emptyPanel {
  padding: var(--space2) var(--space3);
}
</style>
