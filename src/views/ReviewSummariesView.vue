<!--
  Review Summaries: the draft summaries waiting for Matt, one study at a time, so each is read against its abstract and
  citation. Approving (with or without keeping the study off the website), editing and rejecting happen on the card (SummaryReviewCard); this page keeps the queue and the
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
import { studiesInReviewOrder } from "../catalogue/summary";
import { useSummariesAwaitingReview } from "../stores/summaryReview";

const catalogue = useCatalogue();
const awaitingReview = useSummariesAwaitingReview();
const { question: pendingQuestion, ask: confirm, answer } = useConfirmation();
const card = ref<InstanceType<typeof SummaryReviewCard> | null>(null);

/** The studies skipped on this visit, in the order skipped; nothing is saved, so the next visit starts afresh. */
const skippedIds = ref<string[]>([]);

/** The drafts in the order to show them: the skipped ones after the rest. */
const queue = computed(() =>
  studiesInReviewOrder(awaitingReview.value, skippedIds.value),
);

/** The study being reviewed: the first of the queue; the one after it is shown once this one is dealt with. */
const current = computed(() => queue.value[0]);

/** e.g. "3 summaries left to review", "1 summary left to review". */
function remainingText(count: number): string {
  return `${count} ${count === 1 ? "summary" : "summaries"} left to review`;
}

/** The end of a status line after an action: "None left." when the queue is empty, else how many remain. */
function remainingSentence(remaining: number): string {
  return remaining === 0 ? "None left." : `${remainingText(remaining)}.`;
}

/** Says what was done, then how many drafts remain, in the status region. */
function reportOutcome(done: string): void {
  showNoticeNow(`${done} ${remainingSentence(awaitingReview.value.length)}`);
}

/**
 * Moves focus to the next study's title, or to the page heading when the queue is empty. Waits for the card to redraw
 * first, so the title it focuses is the next study's.
 */
async function moveFocusToNext(): Promise<void> {
  await nextTick();
  if (awaitingReview.value.length > 0) card.value?.focusTitle();
  else document.querySelector<HTMLElement>("main h1")?.focus();
}

/** Approves the draft and leaves the study's website setting as it is; the page moves on to the next draft. */
async function approve(): Promise<void> {
  const study = current.value;
  if (study === undefined) return;
  catalogue.approveSummary(study.id);
  reportOutcome(`Approved the summary of "${study.title}".`);
  await moveFocusToNext();
}

/** Approves the draft for this private catalogue only: the study is also kept off the website. */
async function approveKeepPrivate(): Promise<void> {
  const study = current.value;
  if (study === undefined) return;
  catalogue.approveSummaryKeepPrivate(study.id);
  reportOutcome(
    `Approved the summary of "${study.title}" and kept it off the website.`,
  );
  await moveFocusToNext();
}

/** Puts the draft at the end of the queue for this visit, and moves on to the next. */
async function skip(): Promise<void> {
  const study = current.value;
  if (study === undefined) return;
  skippedIds.value = [
    ...skippedIds.value.filter((id) => id !== study.id),
    study.id,
  ];
  showNoticeNow(
    `Skipped "${study.title}". ${remainingText(awaitingReview.value.length)}.`,
  );
  await nextTick();
  card.value?.focusTitle();
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
  reportOutcome(`Rejected the draft summary of "${study.title}".`);
  await moveFocusToNext();
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
        :can-skip="awaitingReview.length > 1"
        @approve="approve"
        @approve-keep-private="approveKeepPrivate"
        @skip="skip"
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
