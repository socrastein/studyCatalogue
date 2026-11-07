<!--
  The main navigation on phone-width screens: a Menu button that opens a panel with the page links and the sliding
  light/dark switch (the library's ThemeSlider, the business site's control), following liftingApp's phone menu. The header shows it instead of its row of links (App.vue).

  It is a disclosure: the button keeps the name "Menu" and reports whether the panel is open (aria-expanded), and the
  panel follows it in the page, so Tab goes from the button into the links. The links are real links, so the current
  page is marked (aria-current, which the library's .menuItem fills with the accent). Escape closes the panel and puts
  focus back on the button; a click elsewhere, choosing a link, or any page change closes it too.
-->
<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import PopupTransition from "lifting-school-ui/components/PopupTransition.vue";
import ThemeSlider from "lifting-school-ui/components/ThemeSlider.vue";
import closeIcon from "lifting-school-ui/icons/x.svg";
import menuIcon from "lifting-school-ui/icons/menu.svg";
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { COLOR_SCHEME_STORAGE_KEY } from "../colorSchemeKey";
import { NAV_LINKS } from "../navigation";

const isOpen = ref(false);
const panel = ref<HTMLElement | null>(null);
const toggleButton = ref<HTMLButtonElement | null>(null);
const route = useRoute();

function close(): void {
  isOpen.value = false;
}

/** Escape: closes the panel and hands focus back to the button, so a keyboard user is not left on a vanished link. */
function closeFromKeyboard(): void {
  if (!isOpen.value) return;
  close();
  toggleButton.value?.focus();
}

// The button is exempt: it opens and closes the panel itself
onClickOutside(panel, close, { ignore: [toggleButton] });

// Back and Forward change the page without a click in the panel
watch(() => route.path, close);
</script>

<template>
  <nav class="phoneMenu" aria-label="Main" @keydown.esc="closeFromKeyboard">
    <button
      ref="toggleButton"
      type="button"
      class="btn btnIcon btnGhost"
      aria-label="Menu"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-controls="phone-menu-panel"
      @click="isOpen = !isOpen"
    >
      <img :src="isOpen ? closeIcon : menuIcon" class="iconSmall" alt="" />
    </button>
    <PopupTransition>
      <div
        v-if="isOpen"
        id="phone-menu-panel"
        ref="panel"
        class="menu menuPanel"
        data-side="bottom"
      >
        <ul class="plainList">
          <li v-for="link in NAV_LINKS" :key="link.path">
            <RouterLink :to="link.path" class="menuItem" @click="close">
              {{ link.name }}
            </RouterLink>
          </li>
        </ul>
        <ThemeSlider :storage-key="COLOR_SCHEME_STORAGE_KEY" />
      </div>
    </PopupTransition>
  </nav>
</template>

<style scoped>
.phoneMenu {
  position: relative;
}

/* Hangs from the button's right edge, over the page, no wider than the screen allows */
.menuPanel {
  position: absolute;
  z-index: 10;
  top: calc(100% + var(--space1));
  right: 0;
  width: min(16rem, calc(100vw - var(--space3)));
  /* The library caps every div at its parent's width, and the parent here is only the button */
  max-width: none;
  align-items: stretch;
}

.menuPanel ul {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Everything lines up on the right, under the menu button, as on the business site's menu */
.menuItem {
  justify-content: flex-end;
}

.menuPanel :deep(.themeSlider) {
  align-self: flex-end;
  margin: var(--space1);
}
</style>
