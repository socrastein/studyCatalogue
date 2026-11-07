<!--
  Any number of choices from a short list, as a group of checkboxes in the library's FormFieldGroup (a fieldset whose
  legend names the question), such as a facet that takes several values (age group, training status, sex).
  Used in the study form and in the browse filters.
-->
<script setup lang="ts">
import FormFieldGroup from "lifting-school-ui/components/FormFieldGroup.vue";
import type { FacetValue } from "../catalogue/facets";

const props = defineProps<{
  /** Prefix for the checkboxes' ids: "study-sexes" gives "study-sexes-male". */
  id: string;
  legend: string;
  values: readonly FacetValue[];
}>();

const model = defineModel<string[]>({ required: true });

/** The id of the checkbox for one value. */
function checkboxId(valueId: string): string {
  return `${props.id}-${valueId}`;
}
</script>

<template>
  <FormFieldGroup :legend="legend">
    <div class="options">
      <label v-for="value in values" :key="value.id" class="choice">
        <input
          :id="checkboxId(value.id)"
          v-model="model"
          class="checkbox"
          type="checkbox"
          :value="value.id"
        />
        {{ value.label }}
      </label>
    </div>
  </FormFieldGroup>
</template>

<style scoped>
.options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
}
</style>
