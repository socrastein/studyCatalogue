<!--
  The list of problems shown at the top of a form after a failed submit (the GOV.UK pattern). The form focuses it,
  so a screen reader reads it straight away; each item links to its field, and following a link puts the cursor in
  that field.
-->
<script setup lang="ts">
import { ref } from "vue";
import type { SummaryItem } from "./studyFormErrors";

defineProps<{ items: SummaryItem[] }>();

const summaryElement = ref<HTMLDivElement | null>(null);

/** Moves focus to the summary, for the form to call after a failed submit. */
function focus(): void {
  summaryElement.value?.focus();
}

/**
 * Puts the cursor in the field. Following an in-page link only scrolls in some browsers; this also focuses, and
 * scrolls the field's label into view along with it.
 */
function focusField(fieldId: string): void {
  const field = document.getElementById(fieldId);
  field?.focus();
  field?.scrollIntoView({ block: "center" });
}

defineExpose({ focus });
</script>

<template>
  <div
    ref="summaryElement"
    class="errorSummary"
    tabindex="-1"
    aria-labelledby="error-summary-title"
  >
    <h2 id="error-summary-title">There is a problem</h2>
    <ul>
      <li v-for="item in items" :key="item.fieldId">
        <a :href="`#${item.fieldId}`" @click.prevent="focusField(item.fieldId)">
          {{ item.message }}
        </a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.errorSummary {
  border: 3px solid var(--danger);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.errorSummary:focus-visible,
.errorSummary:focus {
  outline: 3px solid var(--accentFull);
  outline-offset: 2px;
}

h2 {
  font-size: 1.2rem;
}

ul {
  padding-left: 1.25rem;
}

/* Padded to at least 24px tall, the minimum target size (WCAG 2.5.8), since the links sit right above each other */
a {
  display: inline-block;
  padding: 0.25rem 0;
  color: var(--danger);
  font-weight: bold;
}
</style>
