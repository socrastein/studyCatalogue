<!--
  Settings: the catalogue's backups: download one, add one to the catalogue (merging catalogues kept in different
  browsers; see catalogue/backupMerge.ts), or restore one, which replaces everything. Both ask first, saying what will
  change. Light and dark mode live in the header's theme button instead.

  When the saved catalogue could not be read, a section at the top explains, offers that unreadable data as a file,
  and offers to start over; restoring a backup also resolves it.
-->
<script setup lang="ts">
import ConfirmDialog from "lifting-school-ui/components/ConfirmDialog.vue";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { mergeBackup, type BackupMergeSummary } from "../catalogue/backupMerge";
import { newCatalogue, type Catalogue } from "../catalogue/catalogue";
import { parseCatalogue, serializeCatalogue } from "../catalogue/serialization";
import {
  countApprovedSummaries,
  serializeWebsiteExport,
} from "../catalogue/websiteExport";
import BackupFileField from "../components/BackupFileField.vue";
import {
  changesAnything,
  mergeConfirmationDetail,
  mergeNotice,
} from "../components/backupMergeText";
import {
  backupFileName,
  downloadTextFile,
  websiteExportFileName,
} from "../components/downloadFile";
import { useConfirmation } from "../components/useConfirmation";
import { useCatalogue } from "../stores/catalogueStore";
import { showNoticeOnNextPage } from "../stores/notice";

const catalogue = useCatalogue();
const router = useRouter();
const { question: pendingQuestion, ask: confirm, answer } = useConfirmation();
const addProblem = ref("");
const restoreProblem = ref("");

const loadProblem = computed(() => catalogue.state.loadProblem);

/** e.g. "12 studies and 50 tags". */
function contentsText(contents: Catalogue): string {
  const studies = contents.studies.length;
  const tags = contents.tags.length;
  return `${studies} ${studies === 1 ? "study" : "studies"} and ${tags} ${tags === 1 ? "tag" : "tags"}`;
}

function downloadBackup(): void {
  const text = serializeCatalogue(catalogue.state.catalogue);
  downloadTextFile(backupFileName(), text, "application/json");
}

/** Only approved summaries and the allow-listed fields go in (see catalogue/websiteExport.ts). */
function exportForWebsite(): void {
  const text = serializeWebsiteExport(catalogue.state.catalogue);
  downloadTextFile(websiteExportFileName(), text, "application/json");
}

const approvedSummaryCount = computed(() =>
  countApprovedSummaries(catalogue.state.catalogue.studies),
);

function downloadUnreadableData(): void {
  downloadTextFile(
    "study-catalogue-unreadable.txt",
    loadProblem.value?.rawText ?? "",
    "text/plain",
  );
}

/** Reads the chosen backup and, after confirmation, adds its studies and tags to the catalogue. */
async function addBackup(file: File): Promise<void> {
  const result = parseCatalogue(await file.text());
  if (result.kind === "invalid") {
    addProblem.value = `"${file.name}" cannot be added. ${result.problem}`;
    return;
  }
  addProblem.value = "";
  const merge = mergeBackup(catalogue.state.catalogue, result.catalogue);
  // A backup with nothing new needs no question: the notice says so
  if (changesAnything(merge.summary)) {
    if (!(await confirmAdding(merge.summary))) return;
    catalogue.replaceCatalogue(merge.catalogue);
  }
  showNoticeOnNextPage(mergeNotice(file.name, merge.summary));
  await router.push("/");
}

/** Asks whether to add the backup, saying what it will add and update. */
function confirmAdding(summary: BackupMergeSummary): Promise<boolean> {
  return confirm({
    question: "Add this backup to your catalogue?",
    detail: mergeConfirmationDetail(summary),
    confirmLabel: "Add backup",
  });
}

/** Reads the chosen backup and, after confirmation, makes it the catalogue. */
async function restoreBackup(file: File): Promise<void> {
  const result = parseCatalogue(await file.text());
  if (result.kind === "invalid") {
    restoreProblem.value = `"${file.name}" cannot be restored. ${result.problem}`;
    return;
  }
  restoreProblem.value = "";
  if (!(await confirmReplacingWith(result.catalogue))) return;
  catalogue.replaceCatalogue(result.catalogue);
  showNoticeOnNextPage(`Restored the backup "${file.name}".`);
  await router.push("/");
}

/** Asks whether the backup may replace the current catalogue, saying what each holds. */
function confirmReplacingWith(backup: Catalogue): Promise<boolean> {
  const current = contentsText(catalogue.state.catalogue);
  return confirm({
    question: "Restore this backup?",
    detail: `The backup holds ${contentsText(backup)}. It will replace the current ${current}. This cannot be undone.`,
    confirmLabel: "Replace catalogue",
  });
}

/** After confirmation, discards the unreadable data and starts a new, empty catalogue. */
async function startOver(): Promise<void> {
  const isConfirmed = await confirm({
    question: "Start a new catalogue?",
    detail:
      "The unreadable data will be replaced by an empty catalogue. Download it first if you may want it.",
    confirmLabel: "Start over",
  });
  if (!isConfirmed) return;
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

    <section class="panel" aria-labelledby="export-heading">
      <h2 id="export-heading" class="sectionTitle">Export for the Website</h2>
      <p>
        A file for the public site: each study's citation details, topics and
        design, with its summary once you have approved it. Abstracts and
        unapproved drafts are never included.
      </p>
      <p>
        {{ approvedSummaryCount }} of
        {{ catalogue.state.catalogue.studies.length }}
        {{
          catalogue.state.catalogue.studies.length === 1
            ? "study has"
            : "studies have"
        }}
        an approved summary; the others are exported without one.
      </p>
      <button type="button" class="btn btnSecondary" @click="exportForWebsite">
        Export for the Website
      </button>
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
      <!-- Not offered while the saved catalogue cannot be read: what is in memory then is not what was saved, and
           adding to it would write over the unreadable data -->
      <BackupFileField
        v-if="!loadProblem"
        id="add-backup-file"
        label="Add a backup to this catalogue"
        hint="Adds the backup's studies and tags to the ones here; a study in both keeps its latest edit. Nothing is deleted."
        :error="addProblem"
        @chosen="addBackup"
      />
      <BackupFileField
        id="restore-file"
        label="Replace this catalogue with a backup"
        hint="Replaces the whole catalogue with the backup's contents."
        :error="restoreProblem"
        @chosen="restoreBackup"
      />
    </section>
  </div>
  <ConfirmDialog
    v-if="pendingQuestion"
    v-bind="pendingQuestion"
    @confirm="answer(true)"
    @cancel="answer(false)"
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
