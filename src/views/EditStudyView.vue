<!--
  The edit page for one study, found by the id in the URL: the study form filled in with its details, a delete button
  that asks for confirmation first (saving or deleting the study returns to the study list with a confirmation), and
  below the form the study's summary to correct (StudySummaryEditor), which saves on its own and stays on the page. An
  id that matches no study (deleted, or a mistyped link) gets a short page saying so, with a way back.
-->
<script setup lang="ts">
import ConfirmDialog from "lifting-school-ui/components/ConfirmDialog.vue";
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { StudyDetails } from "../catalogue/study";
import { draftFromDetails } from "../catalogue/studyDraft";
import StudyForm from "../components/StudyForm.vue";
import StudySummaryEditor from "../components/StudySummaryEditor.vue";
import { useConfirmation } from "../components/useConfirmation";
import { useCatalogue } from "../stores/catalogueStore";
import { showNoticeNow, showNoticeOnNextPage } from "../stores/notice";

const props = defineProps<{ id: string }>();

const catalogue = useCatalogue();
const router = useRouter();
const { question: pendingQuestion, ask: confirm, answer } = useConfirmation();

const study = computed(() =>
  catalogue.state.catalogue.studies.find(
    (candidate) => candidate.id === props.id,
  ),
);

/** Saves the edited details, then shows the list with a confirmation. */
async function saveStudy(details: StudyDetails): Promise<void> {
  catalogue.editStudy(props.id, details);
  showNoticeOnNextPage(`Saved changes to "${details.title}".`);
  await router.push("/");
}

/** Asks for confirmation, then deletes the study and shows the list with a confirmation. */
async function deleteStudy(): Promise<void> {
  const title = study.value?.title ?? "";
  const isConfirmed = await confirm({
    question: "Delete this study?",
    detail: `"${title}" will be removed from the catalogue. This cannot be undone.`,
    confirmLabel: "Delete Study",
  });
  if (!isConfirmed) return;
  catalogue.deleteStudy(props.id);
  showNoticeOnNextPage(`Deleted "${title}".`);
  await router.push("/");
}

/** Saves the summary's new words; the page stays, since the study's own fields may be half edited. */
function saveSummary(text: string): void {
  catalogue.editSummary(props.id, text);
  showNoticeNow(`Saved the summary of "${study.value?.title ?? ""}".`);
}

/** Clears the summary's approval, so it waits in the review queue again; the page stays. */
function sendSummaryBackToReview(): void {
  catalogue.sendSummaryBackToReview(props.id);
  showNoticeNow(
    `Sent the summary of "${study.value?.title ?? ""}" back to review.`,
  );
}

/** Asks first, then deletes the summary; the study and its abstract are not affected. */
async function removeSummary(): Promise<void> {
  const title = study.value?.title ?? "";
  const isConfirmed = await confirm({
    question: "Remove this summary?",
    detail: `The summary of "${title}" will be deleted. The study and its abstract are not affected. This cannot be undone.`,
    confirmLabel: "Remove Summary",
  });
  if (!isConfirmed) return;
  catalogue.rejectSummary(props.id);
  showNoticeNow(`Removed the summary of "${title}".`);
}
</script>

<template>
  <template v-if="study">
    <h1 tabindex="-1" class="pageTitle h3">Edit Study</h1>
    <StudyForm
      :key="study.id"
      :initial-draft="draftFromDetails(study)"
      submit-label="Save Changes"
      @save="saveStudy"
    >
      <template #extraActions>
        <button
          type="button"
          class="btn btnDangerSubtle deleteButton"
          @click="deleteStudy"
        >
          Delete Study
        </button>
      </template>
    </StudyForm>
    <StudySummaryEditor
      :key="`${study.id}-summary`"
      class="summaryEditor"
      :study="study"
      @save="saveSummary"
      @send-back="sendSummaryBackToReview"
      @remove="removeSummary"
    />
    <ConfirmDialog
      v-if="pendingQuestion"
      v-bind="pendingQuestion"
      @confirm="answer(true)"
      @cancel="answer(false)"
    />
  </template>
  <template v-else>
    <h1 tabindex="-1" class="pageTitle h3">Study Not Found</h1>
    <p class="center">
      There is no study at this address. It may have been deleted.
      <RouterLink to="/">Back to the study list</RouterLink>
    </p>
  </template>
</template>

<style scoped>
.summaryEditor {
  margin-top: var(--space3);
}

/* At the far end of the form's actions, away from Save */
.deleteButton {
  margin-left: auto;
}
</style>
