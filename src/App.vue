<!--
  The app shell: a skip link, the site header with the main navigation and the light/dark switch, and the current
  page. On wider screens the links sit in a row, and RouterLink marks the current page's with aria-current="page",
  which the styles underline; on phone-width screens the phone menu holds the links and the switch instead.
-->
<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
import ThemeButton from "lifting-school-ui/components/ThemeButton.vue";
import { computed, nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { COLOR_SCHEME_STORAGE_KEY } from "./colorSchemeKey";
import PhoneMenu from "./components/PhoneMenu.vue";
import { navLinks, PHONE_WIDTH_QUERY } from "./navigation";
import { APP_NAME } from "./router.ts";
import { useCatalogue } from "./stores/catalogueStore";
import { advanceNoticeOnNavigation, noticeMessage } from "./stores/notice";
import { useSummariesAwaitingReview } from "./stores/summaryReview";

const route = useRoute();
const catalogue = useCatalogue();
const mainElement = ref<HTMLElement | null>(null);
const isPhoneWidth = useMediaQuery(PHONE_WIDTH_QUERY);
const awaitingReview = useSummariesAwaitingReview();
const links = computed(() => navLinks(awaitingReview.value.length));

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
    <PhoneMenu v-if="isPhoneWidth" />
    <template v-else>
      <nav aria-label="Main">
        <ul class="navList plainList">
          <li v-for="link in links" :key="link.path">
            <RouterLink :to="link.path">{{ link.name }}</RouterLink>
          </li>
        </ul>
      </nav>
      <ThemeButton :storage-key="COLOR_SCHEME_STORAGE_KEY" />
    </template>
  </header>
  <main id="main" ref="mainElement">
    <p
      v-if="catalogue.state.saveProblem"
      class="banner alert alertDanger"
      role="alert"
    >
      {{ catalogue.state.saveProblem }}
    </p>
    <p
      v-if="catalogue.state.loadProblem && route.path !== '/settings'"
      class="banner alert alertDanger"
    >
      Your saved catalogue could not be read, so changes are not being saved.
      <RouterLink to="/settings">Recover it in Settings</RouterLink>
    </p>
    <!-- Always present, so screen readers notice when a message appears in it -->
    <p
      class="banner panel noticeBanner"
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
/* Off screen until it takes keyboard focus, then over the top-left corner */
.skipLink {
  position: absolute;
  left: var(--space2);
  top: calc(-1 * var(--space4));
  padding: var(--space1) var(--space2);
  background: var(--bgTop);
  border: 2px solid var(--accentFull);
  border-radius: var(--radius);
}

.skipLink:focus {
  top: var(--space1);
}

.siteHeader {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space1) var(--space3);
  width: 100%;
  padding: var(--space1) var(--space2);
  background: var(--bgTop);
  border-bottom: 1px solid var(--borderSubtle);
}

/* The name and the nav links keep the text colour; the global link colour is the accent */
.siteName:link,
.siteName:visited,
.navList a:link,
.navList a:visited {
  color: var(--textFull);
}

.siteName {
  font-family: var(--fontHeading);
  font-size: var(--fontSizeXl);
}

.navList {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spaceHalf) var(--space2);
  font-size: var(--fontSizeLg);
}

/* Tall enough for the 24px minimum target size (WCAG 2.5.8) */
.navList a {
  display: inline-block;
  padding: var(--spaceHalf) 0;
}

/* The current page: underlined in the accent colour, so it is marked by more than colour alone */
.navList a[aria-current="page"] {
  text-decoration: underline;
  text-decoration-color: var(--accentFull);
  text-decoration-thickness: 2px;
  text-underline-offset: 0.3em;
}

.banner {
  width: min(100%, 44rem);
  margin-bottom: 0;
  padding: var(--space1) var(--space2);
}

.noticeBanner {
  font-weight: 600;
}

/* Keeps the status region in the page for screen readers while there is nothing to say */
.noticeBanner.isEmpty {
  display: contents;
}

main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space2);
  width: 100%;
  padding: var(--space3) var(--space2);
}
</style>
