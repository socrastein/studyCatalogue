<!--
  Choosing topic tags by typing: an ARIA 1.2 combobox (an input with a list of suggestions) above the chosen tags,
  each shown as a chip with a remove button.

  Keyboard: typing suggests matching tags (by name or alias), Up and Down move through the suggestions, Enter adds
  the highlighted one, Escape closes the list or clears what was typed. With `allowCreate`, the last suggestion
  offers to create a tag when nothing has exactly the typed name; the parent creates it and adds its id.
  Additions and removals are announced in a status region.

  The library's FormField draws the label and hint. Its combobox mode (a label named by id, for a custom drop-down) is
  not used: this combobox is a native input, so `<label for>` names it, and the suggestion list takes the label's
  words as its aria-label.
-->
<script setup lang="ts">
import FormField from "lifting-school-ui/components/FormField.vue";
import { computed, ref, watch } from "vue";
import {
  findTagByName,
  matchingTags,
  tagNameWithParents,
  type Tag,
} from "../catalogue/tags";

/** The most suggestions shown at once; more than this is a list to scroll, not a suggestion. */
const MAX_SUGGESTIONS = 8;

const props = defineProps<{
  id: string;
  label: string;
  hint?: string;
  /** Every tag in the catalogue. */
  tags: readonly Tag[];
  allowCreate: boolean;
}>();

const emit = defineEmits<{
  /** A new tag with this name should be created and added. */
  create: [name: string];
}>();

const selectedIds = defineModel<string[]>({ required: true });

type Option = { kind: "tag"; tag: Tag } | { kind: "create"; name: string };

const query = ref("");
const isOpen = ref(false);
const activeIndex = ref(0);
const announcement = ref("");
const inputElement = ref<HTMLInputElement | null>(null);

const listboxId = computed(() => `${props.id}-suggestions`);
const allTags = computed(() => [...props.tags]);

const selectedTags = computed(() =>
  selectedIds.value
    .map((tagId) => allTags.value.find((tag) => tag.id === tagId))
    .filter((tag) => tag !== undefined),
);

const options = computed<Option[]>(() => {
  if (query.value.trim() === "") return [];
  const unselected = allTags.value.filter(
    (tag) => !selectedIds.value.includes(tag.id),
  );
  const suggestions = matchingTags(query.value, unselected).slice(
    0,
    MAX_SUGGESTIONS,
  );
  const tagOptions: Option[] = suggestions.map((tag) => ({ kind: "tag", tag }));
  return canCreate()
    ? [...tagOptions, { kind: "create", name: query.value.trim() }]
    : tagOptions;
});

const activeOptionId = computed(() =>
  isOpen.value && options.value.length > 0
    ? optionId(activeIndex.value)
    : undefined,
);

// New suggestions start with the first one highlighted, so Enter adds the best match
watch(options, () => {
  activeIndex.value = 0;
});

/** Whether to offer creating a tag from the query: allowed here, and no tag has that exact name or alias. */
function canCreate(): boolean {
  return (
    props.allowCreate && findTagByName(query.value, allTags.value) === undefined
  );
}

/** The element id of one suggestion, for aria-activedescendant. */
function optionId(index: number): string {
  return `${props.id}-option-${index}`;
}

/** What a suggestion says: the tag with its parents, or the offer to create one. */
function optionText(option: Option): string {
  if (option.kind === "create") return `Create tag "${option.name}"`;
  return tagNameWithParents(option.tag, allTags.value);
}

function onInput(): void {
  isOpen.value = true;
}

/** Moves the highlight by `step` (1 down, -1 up), wrapping around the ends, and opens the list. */
function moveHighlight(step: number): void {
  isOpen.value = true;
  const count = options.value.length;
  if (count === 0) return;
  activeIndex.value = (activeIndex.value + step + count) % count;
}

/** Enter adds the highlighted suggestion. It never submits the form while suggestions are showing. */
function onEnter(event: KeyboardEvent): void {
  const option = options.value[activeIndex.value];
  if (!isOpen.value || option === undefined) return;
  event.preventDefault();
  choose(option);
}

/** Escape closes the list if it is open, otherwise clears what was typed. */
function onEscape(): void {
  if (isOpen.value && options.value.length > 0) {
    isOpen.value = false;
    return;
  }
  query.value = "";
}

/** Adds the chosen tag (or asks for a new one), clears the input and closes the list, keeping focus in the input. */
function choose(option: Option): void {
  if (option.kind === "create") {
    emit("create", option.name);
    announcement.value = `Created and added ${option.name}`;
  } else {
    selectedIds.value = [...selectedIds.value, option.tag.id];
    announcement.value = `Added ${option.tag.name}`;
  }
  query.value = "";
  isOpen.value = false;
  inputElement.value?.focus();
}

/** Removes a chosen tag and returns focus to the input, since the chip's button is gone. */
function remove(tag: Tag): void {
  selectedIds.value = selectedIds.value.filter((tagId) => tagId !== tag.id);
  announcement.value = `Removed ${tag.name}`;
  inputElement.value?.focus();
}
</script>

<template>
  <div class="tagCombobox">
    <FormField :id="id" v-slot="field" :label="label" :hint="hint">
      <div class="inputArea">
        <input
          v-bind="field"
          ref="inputElement"
          v-model="query"
          class="input"
          type="text"
          role="combobox"
          autocomplete="off"
          aria-autocomplete="list"
          :aria-expanded="isOpen && options.length > 0 ? 'true' : 'false'"
          :aria-controls="listboxId"
          :aria-activedescendant="activeOptionId"
          @input="onInput"
          @keydown.down.prevent="moveHighlight(1)"
          @keydown.up.prevent="moveHighlight(-1)"
          @keydown.enter="onEnter"
          @keydown.esc="onEscape"
          @blur="isOpen = false"
        />
        <ul
          v-show="isOpen && options.length > 0"
          :id="listboxId"
          role="listbox"
          :aria-label="label"
          class="suggestions menu plainList"
        >
          <li
            v-for="(option, index) in options"
            :id="optionId(index)"
            :key="option.kind === 'tag' ? option.tag.id : 'create'"
            role="option"
            :aria-selected="index === activeIndex ? 'true' : 'false'"
            :class="{
              isActive: index === activeIndex,
              isCreate: option.kind === 'create',
            }"
            @mousedown.prevent="choose(option)"
          >
            {{ optionText(option) }}
          </li>
        </ul>
      </div>
    </FormField>
    <ul
      v-if="selectedTags.length > 0"
      class="chips plainList"
      :aria-label="`Chosen ${label.toLowerCase()}`"
    >
      <li v-for="tag in selectedTags" :key="tag.id" class="chip badge">
        {{ tag.name }}
        <button type="button" class="chipRemove" @click="remove(tag)">
          <span aria-hidden="true">×</span>
          <span class="visuallyHidden">Remove {{ tag.name }}</span>
        </button>
      </li>
    </ul>
    <p class="visuallyHidden" role="status">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.tagCombobox {
  display: flex;
  flex-direction: column;
  gap: var(--space1);
}

.inputArea {
  position: relative;
}

.input {
  width: 100%;
}

/* The list floats over what follows, on the library's menu surface */
.suggestions {
  position: absolute;
  z-index: 1;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: var(--spaceHalf);
}

.suggestions li {
  padding: var(--space1);
  border-radius: var(--radius);
  cursor: pointer;
}

/* The highlighted suggestion: the accent wash plus a bar at its start, so it is marked by more than colour */
.suggestions li.isActive {
  background: var(--accentSubtle);
  box-shadow: inset 4px 0 0 var(--accentFull);
}

.suggestions li.isCreate {
  font-style: italic;
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
</style>
