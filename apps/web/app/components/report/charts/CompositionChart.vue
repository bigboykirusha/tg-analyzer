<script setup lang="ts">
import type { MessageCompositionDto } from '@tg-analyzer/shared'

const props = defineProps<{
  composition: MessageCompositionDto
}>()

const { t, formatNumber } = useI18n()

const segments = computed(() => {
  const counts = {
    text: chartCount(props.composition.text),
    media: chartCount(props.composition.media),
    voice: chartCount(props.composition.voice),
    sticker: chartCount(props.composition.sticker),
    file: chartCount(props.composition.file),
  }
  const total = Math.max(
    Object.values(counts).reduce((sum, value) => sum + value, 0),
    1,
  )

  return [
    {
      label: t('chart.text'),
      value: counts.text,
      ratio: (counts.text / total) * 100,
      className: 'segment-text',
    },
    {
      label: t('chart.media'),
      value: counts.media,
      ratio: (counts.media / total) * 100,
      className: 'segment-media',
    },
    {
      label: t('chart.voice'),
      value: counts.voice,
      ratio: (counts.voice / total) * 100,
      className: 'segment-voice',
    },
    {
      label: t('chart.sticker'),
      value: counts.sticker,
      ratio: (counts.sticker / total) * 100,
      className: 'segment-sticker',
    },
    {
      label: t('chart.files'),
      value: counts.file,
      ratio: (counts.file / total) * 100,
      className: 'segment-files',
    },
  ].filter((segment) => segment.value > 0)
})
</script>

<template>
  <div v-if="segments.length" class="composition">
    <div class="composition-bar" aria-hidden="true">
      <div
        v-for="segment in segments"
        :key="segment.label"
        class="composition-segment"
        :class="segment.className"
        :style="{ width: `${segment.ratio}%` }"
      />
    </div>

    <div class="composition-grid">
      <div v-for="segment in segments" :key="segment.label" class="composition-item">
        <div class="composition-marker" :class="segment.className" />
        <div class="composition-copy">
          <span class="t-small">{{ segment.label }}</span>
          <span class="t-small t-mono">{{ formatNumber(segment.value) }}</span>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="composition-empty t-small">{{ t('chart.noComposition') }}</div>
</template>

<style scoped>
.composition {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.composition-bar {
  display: flex;
  height: 14px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--surface);
  border: 1px solid var(--border);
}

.composition-segment {
  height: 100%;
}

.composition-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--space-3);
}

.composition-empty {
  padding: var(--space-8);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  text-align: center;
}

.composition-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  min-width: 0;
}

.composition-marker {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.composition-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.composition-copy .t-small {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.segment-text {
  background: var(--accent);
}

.segment-media {
  background: var(--border-strong);
}

.segment-voice {
  background: var(--border);
}

.segment-sticker {
  background: var(--text-muted);
}

.segment-files {
  background: var(--warning);
}
</style>
