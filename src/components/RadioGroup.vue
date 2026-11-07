<!--
  One choice from a short list, as a group of radio buttons in the library's FormFieldGroup (a fieldset whose legend
  names the question): a facet that takes one value (study design, subjects). A validation message sits under the
  options and is tied to the group with aria-describedby.
-->
<script setup lang="ts">
import FormFieldGroup from "lifting-school-ui/components/FormFieldGroup.vue";
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
  <FormFieldGroup :legend="legend" :error="error">
    <div class="options">
      <label v-for="value in values" :key="value.id" class="choice">
        <input
          :id="radioId(value.id)"
          v-model="model"
          class="radio"
          type="radio"
          :name="id"
          :value="value.id"
          :aria-invalid="error ? 'true' : undefined"
        />
        {{ value.label }}
      </label>
    </div>
  </FormFieldGroup>
</template>

<style scoped>
.options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
}
</style>
