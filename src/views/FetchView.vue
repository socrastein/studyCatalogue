<!--
  Fetch: the studies with no PDF in Matt's papers folder, so he knows what to fetch next, with the PDFs that could not be
  matched to a study listed below them. The home server does the scan of the folder (server/papers.ts); matching is
  paperMatching.ts. Outside the home server (a dev server) the page says so and lists nothing: it cannot tell which
  papers are on file, and an empty list would say they are not.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { shortAuthorMention } from "../catalogue/citations/authorNames";
import { doiUrl } from "../catalogue/doi";
import {
  matchPapers,
  unmatchedFileReason,
  type PaperMatches,
} from "../catalogue/paperMatching";
import { useCatalogue } from "../stores/catalogueStore";
import { askForPaperFiles } from "../stores/papersClient";

/** What the page shows: still checking the folder, the folder could not be checked, or the matches. */
type FetchState =
  | { kind: "checking" }
  | { kind: "unavailable"; reason: string }
  | { kind: "ready"; matches: PaperMatches };

const catalogue = useCatalogue();
const studies = computed(() => catalogue.state.catalogue.studies);
const state = ref<FetchState>({ kind: "checking" });

onMounted(async () => {
  const answer = await askForPaperFiles(fetch);
  state.value =
    answer.kind === "listed"
      ? {
          kind: "ready",
          matches: matchPapers(studies.value, answer.fileNames),
        }
      : { kind: "unavailable", reason: answer.reason };
});

/** The count line: "172 studies to fetch", "1 study to fetch", or that every study has a PDF. */
function toFetchText(count: number): string {
  if (count === 0) return "Every study has a PDF in the papers folder.";
  return `${count} ${count === 1 ? "study" : "studies"} to fetch`;
}
</script>

<template>
  <h1 tabindex="-1" class="pageTitle h3">Fetch</h1>
  <div class="fetchPage">
    <p v-if="state.kind === 'checking'" role="status">
      Checking the papers folder...
    </p>

    <section
      v-else-if="state.kind === 'unavailable'"
      class="raisedPanel fetchSection"
      aria-label="The Papers Folder Could Not Be Checked"
    >
      <h2 class="sectionTitle">The Papers Folder Could Not Be Checked</h2>
      <p>{{ state.reason }}</p>
    </section>

    <template v-else>
      <p role="status">
        {{ toFetchText(state.matches.studiesWithoutPaper.length) }}
      </p>

      <section
        v-if="state.matches.studiesWithoutPaper.length > 0"
        class="raisedPanel fetchSection"
        aria-label="Studies to Fetch"
      >
        <h2 class="sectionTitle">Studies to Fetch</h2>
        <ol class="plainList">
          <li
            v-for="study in state.matches.studiesWithoutPaper"
            :key="study.id"
            class="card fetchItem"
          >
            <p class="listItemTitle">{{ study.title }}</p>
            <p class="textMuted">{{ shortAuthorMention(study.authors) }}</p>
            <p v-if="study.doi !== null">
              <a :href="doiUrl(study.doi)">{{ study.doi }}</a>
            </p>
            <p v-else>No DOI</p>
          </li>
        </ol>
      </section>

      <section
        v-if="state.matches.unmatchedFiles.length > 0"
        class="raisedPanel fetchSection"
        aria-label="Files Not Matched"
      >
        <h2 class="sectionTitle">Files Not Matched</h2>
        <p class="textMuted">
          These PDFs did not match exactly one study, so no study shows them as
          fetched.
        </p>
        <ol class="plainList">
          <li
            v-for="file in state.matches.unmatchedFiles"
            :key="file.fileName"
            class="card fetchItem"
          >
            <p class="listItemTitle">{{ file.fileName }}</p>
            <p class="textMuted">{{ unmatchedFileReason(file) }}</p>
          </li>
        </ol>
      </section>
    </template>
  </div>
</template>

<style scoped>
.fetchPage {
  width: min(100%, 60rem);
  display: grid;
  gap: var(--space3);
  /* A DOI or a long file name has no spaces to wrap at, so it may break anywhere rather than push the page sideways */
  overflow-wrap: anywhere;
}

.fetchPage ol {
  display: grid;
  gap: var(--space2);
}

/*
 * Each section is a raised panel (the mid surface) holding one card per study or file: the library's layering, never a
 * card on a card. Neither class has padding of its own, so both get the inset here, the panel's wider than its cards'.
 */
.fetchSection {
  display: flex;
  flex-direction: column;
  gap: var(--space2);
  padding: var(--space2);
}

.fetchItem {
  display: flex;
  flex-direction: column;
  gap: var(--spaceHalf);
  padding: var(--space2);
}

/* Wider insets once the screen has room: on a phone they would squeeze the text into a narrow column */
@media (min-width: 40rem) {
  .fetchSection {
    padding: var(--space3);
  }

  .fetchItem {
    padding: var(--space2) var(--space3);
  }
}

.fetchItem p {
  margin: 0;
}
</style>
