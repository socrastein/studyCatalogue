<!--
  A facet that takes several values (age group, training status, sex), as a group of checkboxes in a fieldset whose
  legend names the facet. Used in the study form and in the browse filters.
-->
<script setup lang="ts">
import type { FacetValue } from "../catalogue/facets";

const props = defineProps<{
  /** Prefix for the checkboxes' ids: "study-sexes" gives "study-sexes-male". */
  id: string;
  legend: string;
  hint?: string;
  values: readonly FacetValue[];
}>();

const model = defineModel<string[]>({ required: true });

/** The id of the checkbox for one value. */
function checkboxId(valueId: string): string {
  return `${props.id}-${valueId}`;
}
</script>

<template>
  <fieldset
    class="facetGroup"
    :aria-describedby="hint ? `${id}-hint` : undefined"
  >
    <legend>{{ legend }}</legend>
    <p v-if="hint" :id="`${id}-hint`" class="fieldHint">{{ hint }}</p>
    <div class="options">
      <label v-for="value in values" :key="value.id" class="option">
        <input
          :id="checkboxId(value.id)"
          v-model="model"
          type="checkbox"
          :value="value.id"
        />
        {{ value.label }}
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.facetGroup {
  border: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

legend {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 0.25rem 1rem;
}

.option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0;
  cursor: pointer;
}
</style>
