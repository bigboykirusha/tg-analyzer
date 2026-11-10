<script setup lang="ts">
import type { TopItemDto } from '@tg-analyzer/shared'

/**
 * Words in three groups — «Только вы», «Только <имя>», «Общие» — as chips. Whose they are is said by the
 * group's label (theirs in their ink) and the chips' tone. A phone shows up to eight of each.
 */
const props = withDefaults(
  defineProps<{ mine: TopItemDto[]; theirs: TopItemDto[]; shared: TopItemDto[]; name: string; counts?: boolean }>(),
  { counts: true },
)
const { t } = useI18n()
const groups = computed(() =>
  [
    { key: 'mine' as const, label: t('report.groups.mine'), items: props.mine },
    { key: 'theirs' as const, label: t('report.groups.theirs', { name: props.name }), items: props.theirs },
    { key: 'shared' as const, label: t('report.words.shared'), items: props.shared },
  ].filter((group) => group.items.length),
)
</script>

<template>
  <div class="side-groups">
    <div v-for="group in groups" :key="group.key" class="side-groups__group">
      <p class="side-groups__label" :class="{ 'side-groups__label--theirs': group.key === 'theirs' }">
        {{ group.label }}
      </p>
      <WordChips :items="group.items" :counts="counts" :tone="group.key" />
    </div>
  </div>
</template>

<style scoped>
.side-groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.side-groups__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.side-groups__label {
  color: var(--text-muted);
  font: var(--text-small);
}

.side-groups__label--theirs {
  color: var(--them-ink);
}

@media (max-width: 640px) {
  .side-groups :deep(.chip:nth-child(n + 9)) {
    display: none;
  }
}
</style>
