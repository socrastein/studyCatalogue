<!--
  The author list as one box: paste it as the paper, PubMed or a reference list shows it (see authorList.ts for the
  forms read). Below the box, the names as the app read them, so a wrong guess is caught before saving; this matters
  because the citations are built from these names.
-->
<script setup lang="ts">
import { computed } from "vue";
import { parseAuthorList } from "../catalogue/authorList";
import { apaAuthorName } from "../catalogue/citations/authorNames";
import TextField from "./TextField.vue";

defineProps<{ error?: string }>();

const authorList = defineModel<string>({ required: true });

/**
 * Each author read from the box, written as APA will write it ("Schoenfeld, B. J."), an organization marked as one so
 * a misread is easy to spot.
 */
const readNames = computed(() =>
  parseAuthorList(authorList.value).map((author) => {
    const name = apaAuthorName(author);
    return author.kind === "organization" ? `${name} (organization)` : name;
  }),
);
</script>

<template>
  <div class="authorListField">
    <TextField
      id="study-authors"
      v-model="authorList"
      label="Authors"
      hint="Paste every author, in the paper's order: e.g. Schoenfeld BJ, Ogborn D, Krieger JW. Put an organization in braces: {World Health Organization}."
      :error="error"
      is-multiline
      :rows="2"
    />
    <div v-if="readNames.length > 0" class="readAs">
      <p id="study-authors-read-as" class="fieldNote">
        Read as {{ readNames.length }}
        {{ readNames.length === 1 ? "author" : "authors" }}:
      </p>
      <ol aria-labelledby="study-authors-read-as">
        <li v-for="(name, index) in readNames" :key="index">{{ name }}</li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.authorListField {
  display: flex;
  flex-direction: column;
  gap: var(--space1);
}

/* Row by row, so the numbers read left to right like the pasted list */
.readAs ol {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: 0 var(--space3);
  margin-top: 0;
  padding-left: var(--space3);
  font-size: var(--fontSizeMd);
}

.readAs li {
  margin: 0;
}
</style>
