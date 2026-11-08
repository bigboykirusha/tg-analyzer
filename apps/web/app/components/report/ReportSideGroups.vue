<script setup lang="ts">
import type { TopItemDto } from '@tg-analyzer/shared'

/**
 * Words or emoji in three groups — «Только вы», «Только <имя>», «Общие» — as chips with counts. Whose
 * they are is said by the group's label, in the person's colour for their group; no avatars.
 */
const props = defineProps<{ mine: TopItemDto[]; theirs: TopItemDto[]; shared: TopItemDto[]; name: string }>()
const { t } = useI18n()
const groups = computed(() =>
  [
    { key: 'mine', label: t('report.groups.mine'), items: props.mine },
    { key: 'theirs', label: t('report.groups.theirs', { name: props.name }), items: props.theirs },
    { key: 'shared', label: t('report.words.shared'), items: props.shared },
  ].filter((group) => group.items.length),
)
</script>

<template>
  <div class="side-groups">
    <div
      v-for="group in groups"
      :key="group.key"
      class="side-groups__group"
      :class="`side-groups__group--${group.key}`"
    >
      <span class="side-groups__label">{{ group.label }}</span>
      <WordChips :items="group.items" :empty="t('report.words.none')" />
    </div>
  </div>
</template>

<style scoped>
.side-groups {
  display: grid;
  gap: var(--space-4);
}

.side-groups__group {
  display: grid;
  gap: var(--space-2);
}

.side-groups__label {
  color: var(--text-muted);
  font: var(--text-small);
  font-weight: 500;
}

/* The other side's group carries their colour: its label and a tint of their room on the chips. */
.side-groups__group--theirs .side-groups__label {
  color: var(--them-ink);
}

.side-groups__group--theirs :deep(.chip) {
  background: var(--room-tint);
}

@media (max-width: 640px) {
  .side-groups :deep(.chip:nth-child(n + 9)) {
    display: none;
  }
}
</style>
