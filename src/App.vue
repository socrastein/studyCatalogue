<!--
  The app shell: a skip link, the site header with the main navigation and the light/dark switch, and the current
  page. RouterLink marks the link for the current page with aria-current="page", which the styles underline.
-->
<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import ThemeButton from "lifting-school-ui/components/ThemeButton.vue";
import { useRoute } from "vue-router";
import { COLOR_SCHEME_STORAGE_KEY } from "./colorSchemeKey";
import { APP_NAME } from "./router.ts";
import { useCatalogue } from "./stores/catalogueStore";
import { advanceNoticeOnNavigation, noticeMessage } from "./stores/notice";

const route = useRoute();
const catalogue = useCatalogue();
const mainElement = ref<HTMLElement | null>(null);

/**
 * Moves keyboard and screen reader focus to the new page's heading, so a page change is announced and Tab continues
 * from the top of the new content instead of the nav link that was clicked. The first page load is left alone: the
 * browser already starts at the top.
 */
async function focusPageHeading(): Promise<void> {
  await nextTick();
  const heading = mainElement.value?.querySelector("h1");
  heading?.focus();
}

watch(
  () => route.path,
  (_newPath, oldPath) => {
    advanceNoticeOnNavigation();
    const isFirstLoad = oldPath === undefined;
    if (!isFirstLoad) void focusPageHeading();
  },
);
</script>

<template>
  <a class="skipLink" href="#main">Skip to main content</a>
  <header class="siteHeader">
    <RouterLink to="/" class="siteName">{{ APP_NAME }}</RouterLink>
    <nav aria-label="Main">
      <ul class="navList">
        <li><RouterLink to="/">Studies</RouterLink></li>
        <li><RouterLink to="/studies/new">Add a study</RouterLink></li>
        <li><RouterLink to="/tags">Tags</RouterLink></li>
        <li><RouterLink to="/settings">Settings</RouterLink></li>
      </ul>
    </nav>
    <ThemeButton :storage-key="COLOR_SCHEME_STORAGE_KEY" />
  </header>
  <main id="main" ref="mainElement">
    <p
      v-if="catalogue.state.saveProblem"
      class="banner problemBanner"
      role="alert"
    >
      {{ catalogue.state.saveProblem }}
    </p>
    <p
      v-if="catalogue.state.loadProblem && route.path !== '/settings'"
      class="banner problemBanner"
    >
      Your saved catalogue could not be read, so changes are not being saved.
      <RouterLink to="/settings">Recover it in Settings</RouterLink>
    </p>
    <!-- Always present, so screen readers notice when a message appears in it -->
    <p
      class="banner noticeBanner"
      :class="{ isEmpty: noticeMessage === '' }"
      role="status"
    >
      {{ noticeMessage }}
    </p>
    <!-- Keyed by path, so moving between two edit pages builds a fresh page with that item's details -->
    <RouterView :key="route.path" />
  </main>
</template>

<style scoped>
.skipLink {
  position: absolute;
  left: 1rem;
  top: -3rem;
  padding: 0.5rem 1rem;
  background: var(--bgBase);
  color: var(--textFull);
  border: 2px solid var(--accentFull);
  border-radius: 0.25rem;
}

.skipLink:focus {
  top: 0.5rem;
}

.siteHeader {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bgMid);
  border-bottom: 1px solid var(--borderMuted);
}

.siteName {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--textFull);
  text-decoration: none;
}

.navList {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.25rem;
  list-style: none;
  padding: 0;
}

.navList a {
  color: var(--textFull);
  text-decoration: none;
  padding: 0.25rem 0;
}

.navList a:hover {
  color: var(--accentFull);
}

/* The current page: underlined in the accent colour, so it is marked by more than colour alone */
.navList a[aria-current="page"] {
  border-bottom: 3px solid var(--accentFull);
  font-weight: bold;
}

.banner {
  width: min(100%, 44rem);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border-left: 6px solid;
  background: var(--bgMid);
}

.noticeBanner {
  border-color: var(--accentFull);
}

/* Keeps the status region in the page for screen readers while there is nothing to say */
.noticeBanner.isEmpty {
  display: contents;
}

.problemBanner {
  border-color: var(--danger);
  font-weight: bold;
}

main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 2rem 1rem;
}
</style>
