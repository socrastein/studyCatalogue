<!--
  A yes-or-no question in a modal <dialog>, for actions that cannot be undone ("Delete this study?"). The browser's
  modal dialog keeps focus inside it and closes on Escape; focus starts on Cancel, the safe choice, and returns to
  whatever had it before.

  The parent calls `ask()` and awaits the answer: true for the confirm button, false for Cancel or Escape.
-->
<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  title: string;
  message: string;
  confirmLabel: string;
}>();

const dialogElement = ref<HTMLDialogElement | null>(null);

/** Settles the pending `ask()`; replaced on each `ask()`. */
let answer: (isConfirmed: boolean) => void = () => {};

/** Where focus was when the dialog opened, to put it back after. */
let previouslyFocused: HTMLElement | null = null;

/**
 * Opens the dialog and waits for the person to choose.
 *
 * @returns true when they confirmed; false when they cancelled or pressed Escape.
 */
function ask(): Promise<boolean> {
  previouslyFocused = document.activeElement as HTMLElement | null;
  dialogElement.value?.showModal();
  return new Promise((resolve) => {
    answer = resolve;
  });
}

/** Closes the dialog with the given answer. */
function close(isConfirmed: boolean): void {
  dialogElement.value?.close(isConfirmed ? "confirm" : "cancel");
}

/** Runs however the dialog closed (buttons or Escape): settles the answer and restores focus. */
function onClose(): void {
  answer(dialogElement.value?.returnValue === "confirm");
  previouslyFocused?.focus();
}

defineExpose({ ask });
</script>

<template>
  <dialog
    ref="dialogElement"
    class="confirmDialog"
    aria-labelledby="confirm-dialog-title"
    aria-describedby="confirm-dialog-message"
    @close="onClose"
  >
    <h2 id="confirm-dialog-title">{{ title }}</h2>
    <p id="confirm-dialog-message">{{ message }}</p>
    <div class="actions">
      <button
        type="button"
        class="secondaryButton"
        autofocus
        @click="close(false)"
      >
        Cancel
      </button>
      <button type="button" class="dangerButton" @click="close(true)">
        {{ confirmLabel }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.confirmDialog {
  max-width: min(28rem, calc(100% - 2rem));
  padding: 1.5rem;
  border: 1px solid var(--secondary-color);
  border-radius: 0.5rem;
  background: var(--primary-background);
  color: var(--primary-color);
}

.confirmDialog::backdrop {
  background: rgb(0 0 0 / 60%);
}

h2 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.actions button {
  padding: 0.5rem 1rem;
}
</style>
