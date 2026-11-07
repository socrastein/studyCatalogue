<!--
  A file field for choosing a backup file in Settings. It reports the chosen file and is emptied at once, so choosing
  the same file again still counts.

  Written out instead of the library's FormField: a refused file's error must be announced (role="alert") the moment
  it appears, and FormField's error is not a live region.
-->
<script setup lang="ts">
const props = defineProps<{
  id: string;
  label: string;
  /** What choosing a file will do, shown under the field. */
  hint: string;
  /** Why the last file was refused, or "" when it was not. */
  error: string;
}>();

const emit = defineEmits<{ chosen: [file: File] }>();

const hintId = `${props.id}-hint`;
const errorId = `${props.id}-error`;

/** Passes on the chosen file, then empties the field. */
function onChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file !== undefined) emit("chosen", file);
}
</script>

<template>
  <div class="field">
    <label :for="id" class="fieldLabel">{{ label }}</label>
    <input
      :id="id"
      class="input"
      type="file"
      accept="application/json,.json"
      :aria-describedby="error ? `${hintId} ${errorId}` : hintId"
      :aria-invalid="error ? 'true' : undefined"
      @change="onChange"
    />
    <span :id="hintId" class="fieldNote">{{ hint }}</span>
    <span v-if="error" :id="errorId" class="fieldError" role="alert">
      {{ error }}
    </span>
  </div>
</template>
