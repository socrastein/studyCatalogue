<!--
  The edit page for one tag, found by the id in the URL: its name, aliases and parents saved together, then two
  separate actions that change other things too: merging it into another tag (for duplicates) and deleting it. Both
  ask for confirmation, saying what will happen to the studies that use it. Every outcome returns to the tag list
  with a confirmation.
-->
<script setup lang="ts">
import ConfirmDialog from "lifting-school-ui/components/ConfirmDialog.vue";
import DropdownSelect from "lifting-school-ui/components/DropdownSelect.vue";
import FormField from "lifting-school-ui/components/FormField.vue";
import type { DropdownOption } from "lifting-school-ui/dropdownOption";
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { studyCountForTag } from "../catalogue/tagEdits";
import { descendantIds, tagNameWithParents } from "../catalogue/tags";
import TagPicker from "../components/TagPicker.vue";
import TextField from "../components/TextField.vue";
import { useConfirmation } from "../components/useConfirmation";
import { useCatalogue } from "../stores/catalogueStore";
import { showNoticeOnNextPage } from "../stores/notice";

const props = defineProps<{ id: string }>();

const catalogue = useCatalogue();
const router = useRouter();
const { question: pendingQuestion, ask: confirm, answer } = useConfirmation();

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
/** Why no target is chosen yet, shown as the Merge into field's error; "" when there is none. */
const mergeProblem = ref("");
/** Why the store refused the merge itself, shown as an alert in the merge section; "" when there is none. */
const mergeRefusal = ref("");

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

/** The merge drop-down's options: a prompt that stands for "nothing chosen yet" (empty value), then every target. */
const mergeOptions = computed<DropdownOption<string>[]>(() => [
  { value: "", label: "Choose a tag" },
  ...mergeTargets.value.map((target) => ({
    value: target.id,
    label: target.label,
  })),
]);

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

/** Remembers the chosen merge target and takes away the messages about the last attempt: they no longer apply. */
function chooseMergeTarget(targetId: string): void {
  mergeTargetId.value = targetId;
  mergeProblem.value = "";
  mergeRefusal.value = "";
}

/** After confirmation, merges this tag into the chosen one, or shows why the store refused. */
async function merge(): Promise<void> {
  const target = mergeTargets.value.find(
    (candidate) => candidate.id === mergeTargetId.value,
  );
  if (target === undefined) {
    mergeProblem.value = "Choose the tag to merge into.";
    return;
  }
  if (!(await confirmMergingInto(target.label))) return;
  // Read before merging: the merged tag is gone afterwards
  const name = tag.value?.name ?? "";
  const refusal = catalogue.mergeTags(props.id, target.id);
  mergeRefusal.value = refusal ?? "";
  if (refusal !== null) return;
  showNoticeOnNextPage(`Merged "${name}" into "${target.label}".`);
  await router.push("/tags");
}

/** Asks whether to merge this tag into the target, saying what happens to the studies that use it. */
function confirmMergingInto(targetLabel: string): Promise<boolean> {
  const name = tag.value?.name ?? "";
  return confirm({
    question: `Merge into "${targetLabel}"?`,
    detail: `The ${usageText.value} tagged "${name}" will be tagged "${targetLabel}" instead, and "${name}" will become another name for it.`,
    confirmLabel: "Merge Tags",
  });
}

/** After confirmation, deletes this tag. */
async function deleteThisTag(): Promise<void> {
  const name = tag.value?.name ?? "";
  const isConfirmed = await confirm({
    question: `Delete the tag "${name}"?`,
    detail: `It will be removed from ${usageText.value}, and any subtopics will move up a level. This cannot be undone.`,
    confirmLabel: "Delete Tag",
  });
  if (!isConfirmed) return;
  catalogue.deleteTag(props.id);
  showNoticeOnNextPage(`Deleted the tag "${name}".`);
  await router.push("/tags");
}
</script>

<template>
  <template v-if="tag">
    <h1 tabindex="-1" class="pageTitle h3">Edit Tag: {{ tag.name }}</h1>
    <div class="editTagPage">
      <p>
        Used by
        <RouterLink :to="{ path: '/', query: { tag: tag.id } }">{{
          usageText
        }}</RouterLink
        >.
      </p>

      <form class="panel" novalidate @submit.prevent="save">
        <p v-if="saveProblem" class="alert alertDanger" role="alert">
          {{ saveProblem }}
        </p>
        <TextField id="tag-name" v-model="form.name" label="Name" />
        <TextField
          id="tag-aliases"
          v-model="form.aliases"
          label="Other Names"
          hint="Names that should also find this tag, separated by commas, e.g. muscle growth, muscle size"
          is-optional
        />
        <TagPicker
          id="tag-parents"
          v-model="form.parentIds"
          label="Sits Under"
          hint="Leave empty for a top-level topic. Tags beneath this one are not offered."
          :tags="possibleParents"
          :allow-create="false"
        />
        <div class="actions">
          <button type="submit" class="btn btnPrimary">Save Tag</button>
          <RouterLink to="/tags">Cancel</RouterLink>
        </div>
      </form>

      <section class="panel" aria-labelledby="merge-heading">
        <h2 id="merge-heading" class="sectionTitle">Merge into Another Tag</h2>
        <p class="textMuted">
          For duplicates. Studies move to the tag you choose, and this tag's
          names become other names for it.
        </p>
        <p v-if="mergeRefusal" class="alert alertDanger" role="alert">
          {{ mergeRefusal }}
        </p>
        <FormField
          id="merge-target"
          v-slot="field"
          label="Merge into"
          :error="mergeProblem"
          is-combobox
        >
          <!-- Named by aria-label, not aria-labelledby: a named getByRole on aria-labelledby crashes Firefox under axe (microsoft/playwright#43967). Drop the two lines when Playwright ships a fixed Firefox. -->
          <DropdownSelect
            v-bind="field"
            :labelled-by="undefined"
            label="Merge into"
            :combo-id="field.id"
            :options="mergeOptions"
            :value="mergeTargetId"
            size="regular"
            @change="chooseMergeTarget"
          />
        </FormField>
        <button type="button" class="btn btnDangerSubtle" @click="merge">
          Merge Tags
        </button>
      </section>

      <section class="panel" aria-labelledby="delete-heading">
        <h2 id="delete-heading" class="sectionTitle">Delete This Tag</h2>
        <button
          type="button"
          class="btn btnDangerSubtle"
          @click="deleteThisTag"
        >
          Delete Tag
        </button>
      </section>
    </div>
    <ConfirmDialog
      v-if="pendingQuestion"
      v-bind="pendingQuestion"
      @confirm="answer(true)"
      @cancel="answer(false)"
    />
  </template>
  <template v-else>
    <h1 tabindex="-1" class="pageTitle h3">Tag Not Found</h1>
    <p class="center">
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
  gap: var(--space3);
}

.panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space1);
  padding: var(--space2) var(--space3) var(--space3);
}

/* The panel's gap already spaces the title from what follows */
.sectionTitle {
  margin-bottom: 0;
}

.panel button {
  align-self: flex-start;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space3);
}
</style>
