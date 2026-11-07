<!--
  One labelled text input or textarea, with an optional hint and a validation message. The library's FormField draws
  the label, hint, error and "Optional" note and ties them to the control (aria-describedby, aria-invalid), so screen
  readers hear them on focus; this component picks the control and its text-entry attributes.
-->
<script setup lang="ts">
import FormField from "lifting-school-ui/components/FormField.vue";

withDefaults(
  defineProps<{
    id: string;
    label: string;
    hint?: string;
    error?: string;
    /** Shows the library's "Optional" note under the field; required fields are the unmarked default. */
    isOptional?: boolean;
    isMultiline?: boolean;
    rows?: number;
    type?: string;
    autocomplete?: string;
    inputmode?: "text" | "numeric" | "url";
  }>(),
  { rows: 4, type: "text", autocomplete: "off", inputmode: "text" },
);

const model = defineModel<string>({ required: true });
</script>

<template>
  <FormField
    :id="id"
    v-slot="field"
    :label="label"
    :hint="hint"
    :error="error"
    :optional="isOptional"
  >
    <textarea
      v-if="isMultiline"
      v-bind="field"
      v-model="model"
      class="input"
      :rows="rows"
    ></textarea>
    <input
      v-else
      v-bind="field"
      v-model="model"
      class="input"
      :type="type"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
    />
  </FormField>
</template>

<style scoped>
.input {
  width: 100%;
}

/* The library's textarea is tall enough for a paragraph; `rows` sets the height here instead */
textarea.input {
  min-height: auto;
}
</style>
