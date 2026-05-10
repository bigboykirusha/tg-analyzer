<script setup lang="ts">
import type { MessageCompositionDto } from '@tg-analyzer/shared'

const props = defineProps<{
  composition: MessageCompositionDto
}>()

const { t, formatNumber } = useI18n()

const segments = computed(() => {
  const total = Math.max(
    props.composition.text
      + props.composition.media
      + props.composition.voice
      + props.composition.sticker
      + props.composition.file,
    1,
  )

  return [
    { label: t('chart.text'), value: props.composition.text, ratio: (props.composition.text / total) * 100, className: 'segment-text' },
    { label: t('chart.media'), value: props.composition.media, ratio: (props.composition.media / total) * 100, className: 'segment-media' },
    { label: t('chart.voice'), value: props.composition.voice, ratio: (props.composition.voice / total) * 100, className: 'segment-voice' },
    { label: t('chart.sticker'), value: props.composition.sticker, ratio: (props.composition.sticker / total) * 100, className: 'segment-sticker' },
    { label: t('chart.files'), value: props.composition.file, ratio: (props.composition.file / total) * 100, className: 'segment-files' },
  ]
})
</script>

<template>
  <div class="composition">
    <div class="composition-bar">
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
          <span class="text-body-sm">{{ segment.label }}</span>
          <span class="text-caption mono-value">{{ formatNumber(segment.value) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.composition {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.composition-bar {
  display: flex;
  height: 16px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--bg-overlay);
}

.composition-segment {
  height: 100%;
}

.composition-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-3);
}

.composition-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
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
}

.segment-text {
  background: var(--accent);
}

.segment-media {
  background: var(--border-strong);
}

.segment-voice {
  background: var(--border-default);
}

.segment-sticker {
  background: var(--text-tertiary);
}

.segment-files {
  background: var(--bg-overlay);
}

@media (max-width: 768px) {
  .composition-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
