<!--
  The tag hierarchy as nested lists: the tags directly beneath one parent (or the top-level tags), each with a link to
  edit it, how many studies use it (linking to those studies), its aliases, and its own subtopics below it. A tag with
  several parents appears under each one.

  `ancestorIds` is the path from the top to here. A tag already on that path is not shown again, so a loop in
  imported data cannot nest forever.
-->
<script setup lang="ts">
import { computed } from "vue";
import type { Study } from "../catalogue/study";
import { studyCountForTag } from "../catalogue/tagEdits";
import type { Tag } from "../catalogue/tags";

const props = defineProps<{
  tags: readonly Tag[];
  studies: readonly Study[];
  /** The tag whose subtopics to list; null for the top-level tags. */
  parentId: string | null;
  ancestorIds: readonly string[];
}>();

const children = computed(() => {
  const directChildren = props.tags.filter((tag) =>
    props.parentId === null
      ? tag.parentIds.length === 0
      : tag.parentIds.includes(props.parentId),
  );
  const outsideLoops = directChildren.filter(
    (tag) => !props.ancestorIds.includes(tag.id),
  );
  return [...outsideLoops].sort((first, second) =>
    first.name.localeCompare(second.name),
  );
});

/** e.g. "1 study", "12 studies". */
function usageText(tag: Tag): string {
  const count = studyCountForTag(props.studies, tag.id);
  return `${count} ${count === 1 ? "study" : "studies"}`;
}
</script>

<template>
  <ul v-if="children.length > 0" class="tagTree">
    <li v-for="tag in children" :key="tag.id">
      <div class="tagLine">
        <RouterLink :to="{ name: 'editTag', params: { id: tag.id } }">
          {{ tag.name }}
        </RouterLink>
        <RouterLink :to="{ path: '/', query: { tag: tag.id } }" class="usage">
          {{ usageText(tag)
          }}<span class="visuallyHidden"> tagged {{ tag.name }}</span>
        </RouterLink>
        <span v-if="tag.aliases.length > 0" class="aliases">
          also: {{ tag.aliases.join(", ") }}
        </span>
      </div>
      <TagTree
        :tags="tags"
        :studies="studies"
        :parent-id="tag.id"
        :ancestor-ids="[...ancestorIds, tag.id]"
      />
    </li>
  </ul>
</template>

<style scoped>
.tagTree {
  list-style: none;
  padding-left: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

/* Nested levels are indented, with a guide line showing what they sit under */
.tagTree .tagTree {
  margin: 0.35rem 0 0 0.6rem;
  padding-left: 1rem;
  border-left: 2px solid var(--borderMuted);
}

.tagLine {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.75rem;
}

.usage {
  font-size: 0.9rem;
  color: var(--textMuted);
}

.aliases {
  font-size: 0.9rem;
  font-style: italic;
  color: var(--textMuted);
}
</style>
