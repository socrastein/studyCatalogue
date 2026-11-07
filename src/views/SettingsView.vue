<!--
  Settings: the catalogue's backups: download one, or restore one, which replaces everything after a confirmation
  saying what it holds. Light and dark mode live in the header's theme button instead.

  When the saved catalogue could not be read, a section at the top explains, offers that unreadable data as a file,
  and offers to start over; restoring a backup also resolves it.
-->
<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { newCatalogue, type Catalogue } from "../catalogue/catalogue";
import { parseCatalogue, serializeCatalogue } from "../catalogue/serialization";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { backupFileName, downloadTextFile } from "../components/downloadFile";
import { useCatalogue } from "../stores/catalogueStore";
import { showNoticeOnNextPage } from "../stores/notice";

const catalogue = useCatalogue();
const router = useRouter();
const confirmDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null);
const dialogText = reactive({ title: "", message: "", confirmLabel: "" });
const restoreProblem = ref("");

const loadProblem = computed(() => catalogue.state.loadProblem);

/** e.g. "12 studies and 50 tags". */
function contentsText(contents: Catalogue): string {
  const studies = contents.studies.length;
  const tags = contents.tags.length;
  return `${studies} ${studies === 1 ? "study" : "studies"} and ${tags} ${tags === 1 ? "tag" : "tags"}`;
}

/** Shows the confirmation dialog with the given wording and waits for the answer. */
async function confirm(
  title: string,
  message: string,
  confirmLabel: string,
): Promise<boolean> {
  Object.assign(dialogText, { title, message, confirmLabel });
  return (await confirmDialog.value?.ask()) ?? false;
}

function downloadBackup(): void {
  const text = serializeCatalogue(catalogue.state.catalogue);
  downloadTextFile(backupFileName(), text, "application/json");
}

function downloadUnreadableData(): void {
  downloadTextFile(
    "study-catalogue-unreadable.txt",
    loadProblem.value?.rawText ?? "",
    "text/plain",
  );
}

/** Reads the chosen backup file and, after confirmation, makes it the catalogue. */
async function restoreBackup(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file === undefined) return;
  const result = parseCatalogue(await file.text());
  if (result.kind === "invalid") {
    restoreProblem.value = `"${file.name}" cannot be restored. ${result.problem}`;
    return;
  }
  restoreProblem.value = "";
  const current = contentsText(catalogue.state.catalogue);
  const message = `The backup holds ${contentsText(result.catalogue)}. It will replace the current ${current}. This cannot be undone.`;
  if (!(await confirm("Restore this backup?", message, "Replace catalogue")))
    return;
  catalogue.replaceCatalogue(result.catalogue);
  showNoticeOnNextPage(`Restored the backup "${file.name}".`);
  await router.push("/");
}

/** After confirmation, discards the unreadable data and starts a new, empty catalogue. */
async function startOver(): Promise<void> {
  const message =
    "The unreadable data will be replaced by an empty catalogue. Download it first if you may want it.";
  if (!(await confirm("Start a new catalogue?", message, "Start over"))) return;
  catalogue.replaceCatalogue(newCatalogue());
  showNoticeOnNextPage("Started a new catalogue.");
  await router.push("/");
}
</script>

<template>
  <h1 tabindex="-1" class="pageTitle h3">Settings</h1>
  <div class="settingsPage">
    <section
      v-if="loadProblem"
      class="panel problemPanel"
      aria-labelledby="unreadable-heading"
    >
      <h2 id="unreadable-heading" class="sectionTitle">
        Your saved catalogue could not be read
      </h2>
      <p>{{ loadProblem.message }}</p>
      <p>
        It has not been changed, and nothing will be saved over it until you
        restore a backup or start over.
      </p>
      <div class="actions">
        <button
          type="button"
          class="btn btnSecondary"
          @click="downloadUnreadableData"
        >
          Download the unreadable data
        </button>
        <button type="button" class="btn btnDangerSubtle" @click="startOver">
          Start a new catalogue
        </button>
      </div>
    </section>

    <section class="panel" aria-labelledby="backup-heading">
      <h2 id="backup-heading" class="sectionTitle">Backups</h2>
      <p>
        Your catalogue is saved only in this browser. Clearing the browser's
        site data deletes it, so download a backup now and then.
      </p>
      <button type="button" class="btn btnPrimary" @click="downloadBackup">
        Download a backup
      </button>
      <label for="restore-file" class="fieldLabel">Restore a backup</label>
      <p id="restore-hint" class="fieldHint">
        Replaces the whole catalogue with the backup's contents.
      </p>
      <p
        v-if="restoreProblem"
        id="restore-error"
        class="fieldError"
        role="alert"
      >
        {{ restoreProblem }}
      </p>
      <input
        id="restore-file"
        type="file"
        accept="application/json,.json"
        :aria-describedby="
          restoreProblem ? 'restore-hint restore-error' : 'restore-hint'
        "
        :aria-invalid="restoreProblem ? 'true' : undefined"
        @change="restoreBackup"
      />
    </section>
  </div>
  <ConfirmDialog
    ref="confirmDialog"
    :title="dialogText.title"
    :message="dialogText.message"
    :confirm-label="dialogText.confirmLabel"
  />
</template>

<style scoped>
.settingsPage {
  width: min(100%, 44rem);
  display: flex;
  flex-direction: column;
  gap: var(--space3);
}

.panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space2);
  padding: var(--space2) var(--space3) var(--space3);
}

/* The panel's gap already spaces the title from what follows */
.sectionTitle {
  margin-bottom: 0;
}

/* The unreadable-data warning: an edge in the danger colour, beside a heading that says what is wrong */
.problemPanel {
  border-color: var(--danger);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space1);
}
</style>
