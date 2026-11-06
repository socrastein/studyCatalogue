<!--
  The add-a-study page: an empty study form. Saving adds the study and returns to the study list with a confirmation.
-->
<script setup lang="ts">
import { useRouter } from "vue-router";
import type { StudyDetails } from "../catalogue/study";
import { emptyDraft } from "../catalogue/studyDraft";
import StudyForm from "../components/StudyForm.vue";
import { useCatalogue } from "../stores/catalogueStore";
import { showNoticeOnNextPage } from "../stores/notice";

const catalogue = useCatalogue();
const router = useRouter();

/** Adds the study, then shows the list with a confirmation naming it. */
async function addStudy(details: StudyDetails): Promise<void> {
  catalogue.addStudy(details);
  showNoticeOnNextPage(`Added "${details.title}".`);
  await router.push("/");
}
</script>

<template>
  <h1 tabindex="-1">Add a study</h1>
  <StudyForm
    :initial-draft="emptyDraft()"
    submit-label="Add study"
    @save="addStudy"
  />
</template>
