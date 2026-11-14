<!--
  Choosing topic tags: a searchable drop-down (the library's DropdownSelect) that adds one tag at a time, above the
  chosen tags, each shown as a chip with a remove button.

  The drop-down always lists every tag still available, in the order of the tag tree and each with its parents
  (`tagPickerOptions`); typing narrows it by name, parent or alias. Choosing a row adds the tag and the drop-down is empty
  again, so the next tag can be chosen straight away. Its keyboard behaviour is the library's: Down, Up or Enter opens
  the list, Up and Down move through it, Enter picks, Escape closes.

  The library's drop-down cannot offer "create this tag" from what was typed (it does not report the typed text), so
  with `allowCreate` a small separate field, "New Tag", sits under the chips: type a name, press Enter or "Add New Tag",
  and the parent creates the tag (or finds the one with that name) and adds it. Additions and removals are announced in
  a status region.

  The library's FormField draws the label and hint in its combobox mode. The drop-down is named by `aria-label`, not
  `aria-labelledby`, because of the Firefox crash under axe described in BrowseView.vue.
-->
<script setup lang="ts">
import DropdownSelect from "lifting-school-ui/components/DropdownSelect.vue";
import FormField from "lifting-school-ui/components/FormField.vue";
import { computed, ref } from "vue";
import { newTagRequest, type NewTagRequest } from "../catalogue/newTagRequest";
import { tagPickerOptions } from "../catalogue/tagPickerOptions";
import { tagNameWithParents, type Tag } from "../catalogue/tags";
import TextField from "./TextField.vue";

const props = defineProps<{
  id: string;
  label: string;
  hint?: string;
  /** Every tag that may be chosen. */
  tags: readonly Tag[];
  allowCreate: boolean;
}>();

const emit = defineEmits<{
  /** A tag with this name should be created (or found, if it exists) and added. */
  create: [name: string];
}>();

const selectedIds = defineModel<string[]>({ required: true });

const newTagName = ref("");
/** Why the last Add New Tag did nothing, shown as the New Tag field's error; "" when there is none. */
const newTagError = ref("");
/** What the last Add New Tag did, shown under the field; "" when there is nothing to report. */
const newTagResult = ref("");
const announcement = ref("");
const rootElement = ref<HTMLElement | null>(null);

const options = computed(() => tagPickerOptions(props.tags, selectedIds.value));

/** Each tag's name with its parents, for drawing a row and a chip's context; the drop-down's own label is for matching. */
const namesWithParents = computed(
  () =>
    new Map(
      props.tags.map((tag) => [tag.id, tagNameWithParents(tag, props.tags)]),
    ),
);

const selectedTags = computed(() =>
  selectedIds.value
    .map((tagId) => props.tags.find((tag) => tag.id === tagId))
    .filter((tag) => tag !== undefined),
);

/** The drop-down's accessible name: the field's label (so the visible words are in it) plus what the control does. */
const dropdownName = computed(() => `Add to ${props.label}`);

const newTagFieldId = computed(() => `${props.id}-new`);

/** Typing starts a new request, so the answer to the last one is out of date. */
function clearNewTagAnswer(): void {
  newTagError.value = "";
  newTagResult.value = "";
}

/** Adds the tag the drop-down reported; the drop-down stays focused and empty for the next one. */
function addTag(tagId: string): void {
  selectedIds.value = [...selectedIds.value, tagId];
  const name = props.tags.find((tag) => tag.id === tagId)?.name ?? "";
  announcement.value = `Added ${name}`;
}

/** Removes a chosen tag and returns focus to the drop-down, since the chip's button is gone. */
function removeTag(tag: Tag): void {
  selectedIds.value = selectedIds.value.filter((tagId) => tagId !== tag.id);
  announcement.value = `Removed ${tag.name}`;
  focusInside('[role="combobox"]');
}

/**
 * Carries out the New Tag box's request, after saying what it will do (see `newTagRequest`). A blank name or a tag the
 * study already has creates nothing and is shown as the box's visible error; otherwise the parent creates (or finds)
 * the tag, the box is cleared for the next one, and a visible line says whether the tag is new or was already in the
 * catalogue. Focus stays in the box either way, so the person can carry on typing.
 */
function createNewTag(): void {
  const request = newTagRequest(
    newTagName.value,
    props.tags,
    selectedIds.value,
  );
  newTagError.value = newTagErrorText(request);
  newTagResult.value = newTagResultText(request);
  if (request.kind === "createsNewTag" || request.kind === "addsExistingTag") {
    emit("create", request.tagName);
    newTagName.value = "";
  }
  focusInside(`#${newTagFieldId.value}`);
}

/** The error under the New Tag box for a request that does nothing; "" when the request goes ahead. */
function newTagErrorText(request: NewTagRequest): string {
  if (request.kind === "blank") return "Type a name for the new tag first.";
  if (request.kind === "alreadyChosen")
    return `"${request.tagName}" is already chosen.`;
  return "";
}

/** The line shown after a request went ahead: a created tag and an existing one are told apart; "" when it did nothing. */
function newTagResultText(request: NewTagRequest): string {
  if (request.kind === "blank" || request.kind === "alreadyChosen") return "";
  if (request.kind === "createsNewTag")
    return `Created the new tag "${request.tagName}" and added it.`;
  return `Added the existing tag "${request.tagName}".`;
}

/** Puts focus on the first element inside this component that matches the selector. */
function focusInside(selector: string): void {
  rootElement.value?.querySelector<HTMLElement>(selector)?.focus();
}
</script>

<template>
  <div ref="rootElement" class="tagPicker">
    <FormField :id="id" v-slot="field" :label="label" :hint="hint" is-combobox>
      <!-- Named by aria-label, not aria-labelledby: see the note in BrowseView.vue. -->
      <DropdownSelect
        v-bind="field"
        :labelled-by="undefined"
        :label="dropdownName"
        :combo-id="field.id"
        :options="options"
        value=""
        placeholder="Choose or type to search"
        size="regular"
        searchable
        @change="addTag"
      >
        <template #option="{ option }">
          {{ namesWithParents.get(option.value) ?? option.label }}
        </template>
      </DropdownSelect>
    </FormField>
    <ul
      v-if="selectedTags.length > 0"
      class="chips plainList"
      :aria-label="`Chosen ${label.toLowerCase()}`"
    >
      <li v-for="tag in selectedTags" :key="tag.id" class="chip badge">
        {{ tag.name }}
        <button type="button" class="chipRemove" @click="removeTag(tag)">
          <span aria-hidden="true">×</span>
          <span class="visuallyHidden">Remove {{ tag.name }}</span>
        </button>
      </li>
    </ul>
    <div v-if="allowCreate" class="newTag">
      <TextField
        :id="newTagFieldId"
        v-model="newTagName"
        class="newTagName"
        label="New Tag"
        :error="newTagError || undefined"
        @update:model-value="clearNewTagAnswer"
        @keydown.enter.prevent="createNewTag"
      />
      <button type="button" class="btn btnSecondary" @click="createNewTag">
        Add New Tag
      </button>
    </div>
    <!-- Always present, so screen readers announce what Add New Tag did when it appears -->
    <p
      class="newTagResult"
      :class="{ isEmpty: newTagResult === '' }"
      role="status"
    >
      {{ newTagResult }}
    </p>
    <p class="visuallyHidden" role="status">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.tagPicker {
  display: flex;
  flex-direction: column;
  gap: var(--space1);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space1);
}

.chip {
  display: flex;
  align-items: center;
  gap: var(--spaceHalf);
  padding-right: 0;
}

/* At least 24px square, the minimum target size (WCAG 2.5.8) */
.chipRemove {
  min-width: 1.5rem;
  min-height: 1.5rem;
  border-radius: var(--radiusFull);
  line-height: 1;
}

.chipRemove:hover {
  background: var(--accentSubtle);
}

/* The name box and its button side by side, the button level with the box; wrapping on a phone */
.newTag {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space1);
}

/* Keeps the status region in the page for screen readers while there is nothing to say */
.newTagResult.isEmpty {
  display: contents;
}

.newTagName {
  flex: 1 1 12rem;
}
</style>
