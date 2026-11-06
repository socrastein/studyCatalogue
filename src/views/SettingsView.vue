<!--
  Settings: appearance (mode and colour theme, applied as soon as they are chosen) and the catalogue's backups:
  download one, or restore one, which replaces everything after a confirmation saying what it holds.

  When the saved catalogue could not be read, a section at the top explains, offers that unreadable data as a file,
  and offers to start over; restoring a backup also resolves it.
-->
<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { newCatalogue, type Catalogue } from "../catalogue/catalogue";
import { parseCatalogue, serializeCatalogue } from "../catalogue/serialization";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import RadioGroup from "../components/RadioGroup.vue";
import { backupFileName, downloadTextFile } from "../components/downloadFile";
import { useCatalogue } from "../stores/catalogueStore";
import { showNoticeOnNextPage } from "../stores/notice";
import {
  COLOR_THEMES,
  MODE_CHOICES,
  useSettings,
  type ColorThemeName,
  type ModeChoice,
} from "../stores/settingsStore";

const catalogue = useCatalogue();
const { settings, setMode, setColorTheme } = useSettings();
const router = useRouter();
const confirmDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null);
const dialogText = reactive({ title: "", message: "", confirmLabel: "" });
const restoreProblem = ref("");

const THEME_CHOICES = (Object.keys(COLOR_THEMES) as ColorThemeName[]).map(
  (name) => ({
    id: name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
  }),
);

const mode = computed({
  get: () => settings.mode,
  set: (choice: string) => setMode(choice as ModeChoice),
});
const colorTheme = computed({
  get: () => settings.colorTheme,
  set: (choice: string) => setColorTheme(choice as ColorThemeName),
});

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
  <h1 tabindex="-1">Settings</h1>
  <div class="settingsPage">
    <section
      v-if="loadProblem"
      class="panel problemPanel"
      aria-labelledby="unreadable-heading"
    >
      <h2 id="unreadable-heading">Your saved catalogue could not be read</h2>
      <p>{{ loadProblem.message }}</p>
      <p>
        It has not been changed, and nothing will be saved over it until you
        restore a backup or start over.
      </p>
      <div class="actions">
        <button
          type="button"
          class="secondaryButton"
          @click="downloadUnreadableData"
        >
          Download the unreadable data
        </button>
        <button type="button" class="dangerButton" @click="startOver">
          Start a new catalogue
        </button>
      </div>
    </section>

    <section class="panel" aria-labelledby="appearance-heading">
      <h2 id="appearance-heading">Appearance</h2>
      <RadioGroup
        id="setting-mode"
        v-model="mode"
        legend="Mode"
        :values="MODE_CHOICES"
      />
      <RadioGroup
        id="setting-theme"
        v-model="colorTheme"
        legend="Colour"
        :values="THEME_CHOICES"
      />
    </section>

    <section class="panel" aria-labelledby="backup-heading">
      <h2 id="backup-heading">Backups</h2>
      <p>
        Your catalogue is saved only in this browser. Clearing the browser's
        site data deletes it, so download a backup now and then.
      </p>
      <button type="button" class="backupButton" @click="downloadBackup">
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
  gap: 1.5rem;
}

.panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--secondary-background);
  border-radius: 0.5rem;
}

.problemPanel {
  border-left: 6px solid var(--error-color);
}

h2 {
  font-size: 1.2rem;
}

.fieldLabel {
  font-weight: bold;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

button {
  align-self: flex-start;
  padding: 0.5rem 1rem;
}

input[type="file"] {
  padding: 0.4rem;
}
</style>
