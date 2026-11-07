<!--
  The edit page for one study, found by the id in the URL: the study form filled in with its details, plus a delete
  button that asks for confirmation first. Either way it returns to the study list with a confirmation. An id that
  matches no study (deleted, or a mistyped link) gets a short page saying so, with a way back.
-->
<script setup lang="ts">
import ConfirmDialog from "lifting-school-ui/components/ConfirmDialog.vue";
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { StudyDetails } from "../catalogue/study";
import { draftFromDetails } from "../catalogue/studyDraft";
import StudyForm from "../components/StudyForm.vue";
import { useConfirmation } from "../components/useConfirmation";
import { useCatalogue } from "../stores/catalogueStore";
import { showNoticeOnNextPage } from "../stores/notice";

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
    confirmLabel: "Delete study",
  });
  if (!isConfirmed) return;
  catalogue.deleteStudy(props.id);
  showNoticeOnNextPage(`Deleted "${title}".`);
  await router.push("/");
}
</script>

<template>
  <template v-if="study">
    <h1 tabindex="-1" class="pageTitle h3">Edit study</h1>
    <StudyForm
      :key="study.id"
      :initial-draft="draftFromDetails(study)"
      submit-label="Save changes"
      @save="saveStudy"
    >
      <template #extraActions>
        <button
          type="button"
          class="btn btnDangerSubtle deleteButton"
          @click="deleteStudy"
        >
          Delete study
        </button>
      </template>
    </StudyForm>
    <ConfirmDialog
      v-if="pendingQuestion"
      v-bind="pendingQuestion"
      @confirm="answer(true)"
      @cancel="answer(false)"
    />
  </template>
  <template v-else>
    <h1 tabindex="-1" class="pageTitle h3">Study not found</h1>
    <p>
      There is no study at this address. It may have been deleted.
      <RouterLink to="/">Back to the study list</RouterLink>
    </p>
  </template>
</template>

<style scoped>
/* At the far end of the form's actions, away from Save */
.deleteButton {
  margin-left: auto;
}
</style>
