<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/** Stickers sent: the favourites as a grid and the split between the two of you as one bar. */
const props = defineProps<{ data: ReportDto }>()
const { t, tc } = useI18n()

const stickers = computed(() => props.data.report.stickers)
const versus = useVersus(() => props.data)
const name = computed(() => props.data.summary.title)
const variety = computed(() => {
  const stats = stickers.value
  if (!stats?.distinct) return undefined
  const kinds = tc('report.talk.stickerKinds', stats.distinct)
  return stats.packs ? `${kinds} ${tc('report.talk.packs', stats.packs)}` : kinds
})
</script>

<template>
  <ReportSection v-if="stickers?.top.length" :title="t('report.talk.stickersTitle')" :text="variety">
    <StickerGrid :stickers="stickers.top" />
    <div v-if="versus.stickers" class="split">
      <i class="split__bar" aria-hidden="true">
        <b :style="{ flexGrow: versus.stickers.pairs[0]!.mine.value }" />
        <b :style="{ flexGrow: versus.stickers.pairs[0]!.theirs.value }" />
      </i>
      <p class="split__legend t-num">
        <span>{{ t('report.you') }} · {{ versus.stickers.pairs[0]!.mine.text }}</span>
        <span>{{ name }} · {{ versus.stickers.pairs[0]!.theirs.text }}</span>
      </p>
    </div>
  </ReportSection>
</template>

<style scoped>
.split {
  display: grid;
  gap: var(--space-2);
  margin-top: auto;
}

.split__bar {
  display: flex;
  gap: 3px;
  height: var(--bar-height);
}

.split__bar b {
  border-radius: var(--radius-full);
  background: var(--you);
}

.split__bar b + b {
  background: var(--them);
}

.split__legend {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
