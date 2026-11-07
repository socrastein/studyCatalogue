<!--
  A small confirmation pinned to the bottom of the screen, so a click on a copy button visibly does something even when
  the card is far from the top of the page. The region is always in the page, so screen readers announce the text when
  it appears. The page that owns it clears the message after a few seconds (see BrowseView.vue).
-->
<script setup lang="ts">
defineProps<{
  /** What to say, e.g. "APA citation copied to clipboard."; empty hides the toast. */
  message: string;
}>();
</script>

<template>
  <div class="toastRegion" role="status">
    <p v-if="message !== ''" class="toast card">{{ message }}</p>
  </div>
</template>

<style scoped>
.toastRegion {
  position: fixed;
  inset-inline: var(--space2);
  bottom: var(--space2);
  display: flex;
  justify-content: center;
  /* Lets clicks through the empty strip beside and around the toast */
  pointer-events: none;
}

.toast {
  padding: var(--space1) var(--space3);
  /* The subtle accent is a see-through wash, so it is laid over the card's solid face to keep the list from showing through */
  background:
    linear-gradient(var(--accentSubtle), var(--accentSubtle)), var(--bgTop);
  box-shadow: var(--shadowRaised);
}
</style>
