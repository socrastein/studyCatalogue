<!--
  The DOI field with a button that fills in the rest of the publication details from Crossref. The outcome is
  announced in a status region: what was filled in, or why nothing was (an invalid DOI, one Crossref does not know,
  or Crossref out of reach). The form applies the found fields; this component only looks them up.
-->
<script setup lang="ts">
import { computed, ref } from "vue";
import { filledFieldNames, type CrossrefFields } from "../catalogue/crossref";
import { isValidDoi, normalizeDoi } from "../catalogue/doi";
import TextField from "./TextField.vue";
import { lookUpDoi, type LookupResult } from "./lookUpDoi";

const props = defineProps<{ error?: string }>();

const emit = defineEmits<{ found: [fields: CrossrefFields] }>();

const doi = defineModel<string>({ required: true });

const isLookingUp = ref(false);
const lookupProblem = ref("");
const announcement = ref("");

/** A lookup problem replaces the form's own DOI message until the next lookup or submit. */
const shownError = computed(() => lookupProblem.value || props.error);

/** Checks the DOI, asks Crossref for it, and passes on what was found. */
async function fillFromDoi(): Promise<void> {
  const bareDoi = normalizeDoi(doi.value);
  announcement.value = "";
  if (bareDoi === null || !isValidDoi(bareDoi)) {
    lookupProblem.value =
      "Enter a DOI starting with 10., or a doi.org link, to look it up.";
    return;
  }
  lookupProblem.value = "";
  isLookingUp.value = true;
  const result = await lookUpDoi(bareDoi);
  isLookingUp.value = false;
  report(result);
}

/** Emits found fields and announces the outcome, or shows why the lookup found nothing. */
function report(result: LookupResult): void {
  if (result.kind === "notFound") {
    lookupProblem.value =
      "Crossref has no record of this DOI. Check it, or fill in the details yourself.";
    return;
  }
  if (result.kind === "failed") {
    lookupProblem.value =
      "Could not reach Crossref. Check your connection and try again, or fill in the details yourself.";
    return;
  }
  emit("found", result.fields);
  announcement.value = filledAnnouncement(filledFieldNames(result.fields));
}

/** e.g. "Filled in the title, authors and year from Crossref. Check them before saving." */
function filledAnnouncement(names: string[]): string {
  if (names.length === 0)
    return "Crossref has this DOI but no details to fill in.";
  const allButLast = names.slice(0, -1);
  const list =
    allButLast.length === 0
      ? names.join("")
      : `${allButLast.join(", ")} and ${names.at(-1)}`;
  return `Filled in the ${list} from Crossref. Check them before saving.`;
}
</script>

<template>
  <div class="doiField">
    <TextField
      id="study-doi"
      v-model="doi"
      label="DOI"
      hint="e.g. 10.1080/02640414.2016.1210197, or paste the doi.org link. Then fill in the rest from Crossref."
      :error="shownError"
      is-optional
    />
    <div class="lookupRow">
      <button
        type="button"
        class="btn btnSecondary"
        :disabled="isLookingUp"
        :aria-busy="isLookingUp ? 'true' : undefined"
        @click="fillFromDoi"
      >
        {{ isLookingUp ? "Looking up…" : "Fill in from DOI" }}
      </button>
      <p class="lookupStatus" role="status">{{ announcement }}</p>
    </div>
  </div>
</template>

<style scoped>
.doiField {
  display: flex;
  flex-direction: column;
  gap: var(--space1);
}

.lookupRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space1) var(--space2);
}

.lookupStatus {
  font-weight: 700;
}
</style>
