<!--
  One choice from a short list, as a group of radio buttons in a fieldset whose legend names the question: a facet
  that takes one value (study design, subjects) or a setting (mode, colour theme).
  A validation message sits under the legend and is tied to the group with aria-describedby.
-->
<script setup lang="ts">
import type { FacetValue } from "../catalogue/facets";

const props = defineProps<{
  /** Prefix for the radios' ids: "study-design" gives "study-design-cohort". */
  id: string;
  legend: string;
  values: readonly FacetValue[];
  error?: string;
}>();

const model = defineModel<string>({ required: true });

/** The id of the radio for one value; the first one is what the error summary links to. */
function radioId(valueId: string): string {
  return `${props.id}-${valueId}`;
}
</script>

<template>
  <fieldset
    class="facetGroup"
    :aria-describedby="error ? `${id}-error` : undefined"
  >
    <legend>{{ legend }}</legend>
    <p v-if="error" :id="`${id}-error`" class="fieldError">{{ error }}</p>
    <div class="options">
      <label v-for="value in values" :key="value.id" class="option">
        <input
          :id="radioId(value.id)"
          v-model="model"
          type="radio"
          :name="id"
          :value="value.id"
          :aria-invalid="error ? 'true' : undefined"
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
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
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
