<!--
  The add-a-study page. For now it mounts the original hand-built form (src/modules/newStudyForm) inside the Vue app,
  until the Vue study form replaces it.
-->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import newStudyForm from "../modules/newStudyForm/newStudyForm.ts";

const formHost = ref<HTMLDivElement | null>(null);

onMounted(() => {
  formHost.value?.append(newStudyForm());
});
</script>

<template>
  <h1 tabindex="-1">Add a study</h1>
  <div ref="formHost"></div>
</template>
