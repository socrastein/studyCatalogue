<!--
  The edit page for one tag, found by the id in the URL: its name, aliases and parents saved together, then two
  separate actions that change other things too: merging it into another tag (for duplicates) and deleting it. Both
  ask for confirmation, saying what will happen to the studies that use it. Every outcome returns to the tag list
  with a confirmation.
-->
<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { studyCountForTag } from "../catalogue/tagEdits";
import { descendantIds, tagNameWithParents } from "../catalogue/tags";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import TagCombobox from "../components/TagCombobox.vue";
import TextField from "../components/TextField.vue";
import { useCatalogue } from "../stores/catalogueStore";
import { showNoticeOnNextPage } from "../stores/notice";

const props = defineProps<{ id: string }>();

const catalogue = useCatalogue();
const router = useRouter();
const confirmDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null);
const dialogText = reactive({ title: "", message: "", confirmLabel: "" });

const tags = computed(() => catalogue.state.catalogue.tags);
const tag = computed(() =>
  tags.value.find((candidate) => candidate.id === props.id),
);
const usage = computed(() =>
  studyCountForTag(catalogue.state.catalogue.studies, props.id),
);
const usageText = computed(
  () => `${usage.value} ${usage.value === 1 ? "study" : "studies"}`,
);

/** The form's fields, filled from the tag as saved; aliases as one comma-separated line. */
const form = reactive({
  name: tag.value?.name ?? "",
  aliases: tag.value?.aliases.join(", ") ?? "",
  parentIds: [...(tag.value?.parentIds ?? [])],
});
const saveProblem = ref("");
const mergeTargetId = ref("");
const mergeProblem = ref("");

/** Tags this one may sit under: any but itself and the tags already beneath it. */
const possibleParents = computed(() => {
  const beneath = descendantIds(props.id, tags.value);
  return tags.value.filter((candidate) => !beneath.has(candidate.id));
});

/** Tags this one may be merged into, by name with parents so duplicates can be told apart. */
const mergeTargets = computed(() =>
  tags.value
    .filter((candidate) => candidate.id !== props.id)
    .map((candidate) => ({
      id: candidate.id,
      label: tagNameWithParents(candidate, tags.value),
    }))
    .sort((first, second) => first.label.localeCompare(second.label)),
);

/** Saves name, aliases and parents together, or shows why they were refused. */
async function save(): Promise<void> {
  const aliases = form.aliases.split(",");
  const changes = { name: form.name, aliases, parentIds: form.parentIds };
  const problem = catalogue.editTag(props.id, changes);
  saveProblem.value = problem ?? "";
  if (problem !== null) return;
  showNoticeOnNextPage(`Saved the tag "${form.name.trim()}".`);
  await router.push("/tags");
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

/** After confirmation, merges this tag into the chosen one. */
async function merge(): Promise<void> {
  const target = mergeTargets.value.find(
    (candidate) => candidate.id === mergeTargetId.value,
  );
  if (target === undefined) {
    mergeProblem.value = "Choose the tag to merge into.";
    return;
  }
  const name = tag.value?.name ?? "";
  const message = `The ${usageText.value} tagged "${name}" will be tagged "${target.label}" instead, and "${name}" will become another name for it.`;
  if (!(await confirm(`Merge into "${target.label}"?`, message, "Merge tags")))
    return;
  catalogue.mergeTags(props.id, target.id);
  showNoticeOnNextPage(`Merged "${name}" into "${target.label}".`);
  await router.push("/tags");
}

/** After confirmation, deletes this tag. */
async function deleteThisTag(): Promise<void> {
  const name = tag.value?.name ?? "";
  const message = `It will be removed from ${usageText.value}, and any subtopics will move up a level. This cannot be undone.`;
  if (!(await confirm(`Delete the tag "${name}"?`, message, "Delete tag")))
    return;
  catalogue.deleteTag(props.id);
  showNoticeOnNextPage(`Deleted the tag "${name}".`);
  await router.push("/tags");
}
</script>

<template>
  <template v-if="tag">
    <h1 tabindex="-1">Edit tag: {{ tag.name }}</h1>
    <div class="editTagPage">
      <p>
        Used by
        <RouterLink :to="{ path: '/', query: { tag: tag.id } }">{{
          usageText
        }}</RouterLink
        >.
      </p>

      <form class="panel" novalidate @submit.prevent="save">
        <p v-if="saveProblem" class="fieldError" role="alert">
          {{ saveProblem }}
        </p>
        <TextField id="tag-name" v-model="form.name" label="Name" />
        <TextField
          id="tag-aliases"
          v-model="form.aliases"
          label="Other names"
          hint="Names that should also find this tag, separated by commas, e.g. muscle growth, muscle size"
          is-optional
        />
        <TagCombobox
          id="tag-parents"
          v-model="form.parentIds"
          label="Sits under"
          hint="Leave empty for a top-level topic. Tags beneath this one are not offered."
          :tags="possibleParents"
          :allow-create="false"
        />
        <div class="actions">
          <button type="submit" class="primaryAction">Save tag</button>
          <RouterLink to="/tags">Cancel</RouterLink>
        </div>
      </form>

      <section class="panel" aria-labelledby="merge-heading">
        <h2 id="merge-heading">Merge into another tag</h2>
        <p class="fieldHint">
          For duplicates. Studies move to the tag you choose, and this tag's
          names become other names for it.
        </p>
        <label for="merge-target" class="fieldLabel">Merge into</label>
        <p v-if="mergeProblem" id="merge-target-error" class="fieldError">
          {{ mergeProblem }}
        </p>
        <select
          id="merge-target"
          v-model="mergeTargetId"
          :aria-invalid="mergeProblem ? 'true' : undefined"
          :aria-describedby="mergeProblem ? 'merge-target-error' : undefined"
        >
          <option value="">Choose a tag</option>
          <option
            v-for="target in mergeTargets"
            :key="target.id"
            :value="target.id"
          >
            {{ target.label }}
          </option>
        </select>
        <button type="button" class="dangerButton" @click="merge">
          Merge tags
        </button>
      </section>

      <section class="panel" aria-labelledby="delete-heading">
        <h2 id="delete-heading">Delete this tag</h2>
        <button type="button" class="dangerButton" @click="deleteThisTag">
          Delete tag
        </button>
      </section>
    </div>
    <ConfirmDialog
      ref="confirmDialog"
      :title="dialogText.title"
      :message="dialogText.message"
      :confirm-label="dialogText.confirmLabel"
    />
  </template>
  <template v-else>
    <h1 tabindex="-1">Tag not found</h1>
    <p>
      There is no tag at this address. It may have been merged or deleted.
      <RouterLink to="/tags">Back to the tags</RouterLink>
    </p>
  </template>
</template>

<style scoped>
.editTagPage {
  width: min(100%, 44rem);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
  padding: 1.25rem;
  background: var(--bgMid);
  border-radius: 0.5rem;
}

h2 {
  font-size: 1.2rem;
}

.fieldLabel {
  font-weight: bold;
}

select {
  padding: 0.4rem 0.5rem;
  color: var(--textFull);
  background: var(--bgBase);
  border: 1px solid var(--borderMuted);
  border-radius: 0.25rem;
}

.panel button {
  align-self: flex-start;
  padding: 0.5rem 1rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
</style>
