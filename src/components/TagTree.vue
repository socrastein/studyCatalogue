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
  <ul v-if="children.length > 0" class="tagTree plainList">
    <li v-for="tag in children" :key="tag.id">
      <div class="tagLine">
        <RouterLink :to="{ name: 'editTag', params: { id: tag.id } }">
          {{ tag.name }}
        </RouterLink>
        <RouterLink
          :to="{ path: '/', query: { tag: tag.id } }"
          class="usage textMuted"
        >
          {{ usageText(tag)
          }}<span class="visuallyHidden"> tagged {{ tag.name }}</span>
        </RouterLink>
        <span v-if="tag.aliases.length > 0" class="aliases textMuted">
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
  display: flex;
  flex-direction: column;
  gap: var(--space1);
}

/* Nested levels are indented, with a guide line showing what they sit under */
.tagTree .tagTree {
  margin: var(--space1) 0 0 var(--space1);
  padding-left: var(--space2);
  border-left: 2px solid var(--borderSubtle);
}

.tagLine {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--spaceHalf) var(--space2);
}

.usage,
.aliases {
  font-size: var(--fontSizeSm);
}

/* The usage link is muted like the aliases, so the tag's own name stands out; weight still marks it as a link */
.usage:link,
.usage:visited {
  color: var(--textMuted);
}

.aliases {
  font-style: italic;
}
</style>
