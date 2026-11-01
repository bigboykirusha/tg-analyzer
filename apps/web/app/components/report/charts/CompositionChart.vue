<script setup lang="ts">
import type { MessageCompositionDto } from '@tg-analyzer/shared'

/** What the chat is made of: five numbers in a row, each with its share. No bar. */
const props = defineProps<{
  composition: MessageCompositionDto
}>()

const { t, formatNumber, formatPercent } = useI18n()

const kinds = computed(() => {
  const items = [
    { key: 'text', label: t('chart.text'), value: chartCount(props.composition.text) },
    { key: 'media', label: t('chart.media'), value: chartCount(props.composition.media) },
    { key: 'voice', label: t('chart.voice'), value: chartCount(props.composition.voice) },
    { key: 'sticker', label: t('chart.sticker'), value: chartCount(props.composition.sticker) },
    { key: 'file', label: t('chart.files'), value: chartCount(props.composition.file) },
  ]
  const total = items.reduce((sum, item) => sum + item.value, 0)
  return total ? items.map((item) => ({ ...item, share: Math.round((item.value / total) * 100) })) : []
})
</script>

<template>
  <dl v-if="kinds.length" class="composition">
    <div v-for="kind in kinds" :key="kind.key" class="composition__item" :class="{ 'is-zero': !kind.value }">
      <dt>{{ kind.label }}</dt>
      <dd class="composition__value t-num">{{ formatNumber(kind.value) }}</dd>
      <dd class="composition__share t-num">{{ formatPercent(kind.share) }}</dd>
    </div>
  </dl>
  <p v-else class="t-small t-muted">{{ t('chart.noComposition') }}</p>
</template>

<style scoped>
.composition {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-4);
  margin: 0;
}

.composition__item {
  display: grid;
  align-content: start;
  gap: 2px;
  min-width: 0;
}

.composition__item dt {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composition__item dd {
  margin: 0;
}

.composition__value {
  font: var(--text-title);
}

.composition__share {
  color: var(--text-muted);
  font: var(--text-caption);
}

.composition__item.is-zero .composition__value {
  color: var(--text-muted);
}

/* Phones: three and two, read as one block. */
@media (max-width: 640px) {
  .composition {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    row-gap: var(--space-3);
  }
}
</style>
