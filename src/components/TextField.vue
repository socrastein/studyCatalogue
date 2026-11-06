<!--
  One labelled text input or textarea, with an optional hint and a validation message. The hint and the message are
  tied to the input with aria-describedby, and the input is marked aria-invalid while it has a message, so screen
  readers hear both on focus.
-->
<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    id: string;
    label: string;
    hint?: string;
    error?: string;
    /** Labels the field "(optional)"; required fields are the unmarked default. */
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

const hintId = computed(() => `${props.id}-hint`);
const errorId = computed(() => `${props.id}-error`);

/** The ids of whatever describes the input right now: its hint, its error, both or neither. */
const describedBy = computed(() => {
  const ids = [
    props.hint ? hintId.value : "",
    props.error ? errorId.value : "",
  ];
  const present = ids.filter((describerId) => describerId !== "");
  return present.length > 0 ? present.join(" ") : undefined;
});
</script>

<template>
  <div class="textField">
    <label :for="id" class="fieldLabel">
      {{ label }}<span v-if="isOptional" class="optionalMark"> (optional)</span>
    </label>
    <p v-if="hint" :id="hintId" class="fieldHint">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="fieldError">{{ error }}</p>
    <textarea
      v-if="isMultiline"
      :id="id"
      v-model="model"
      :rows="rows"
      :aria-describedby="describedBy"
      :aria-invalid="error ? 'true' : undefined"
    ></textarea>
    <input
      v-else
      :id="id"
      v-model="model"
      :type="type"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :aria-describedby="describedBy"
      :aria-invalid="error ? 'true' : undefined"
    />
  </div>
</template>

<style scoped>
.textField {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.fieldLabel {
  font-weight: bold;
}

.optionalMark {
  font-weight: normal;
  color: var(--secondary-color);
}

input,
textarea {
  width: 100%;
  padding: 0.4rem 0.5rem;
}

textarea {
  resize: vertical;
}
</style>
