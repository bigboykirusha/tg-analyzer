<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/** Stickers sent: the favourites as a grid and the split between the two of you as one bar. */
const props = defineProps<{ data: ReportDto }>()
const { t, tc } = useI18n()

const stickers = computed(() => props.data.report.stickers)
const versus = useVersus(() => props.data)
const pair = computed(() => versus.value.stickers?.pairs[0] ?? null)
const answer = computed(() => {
  const item = versus.value.stickers
  if (!item) return null
  return item.lead ? `${item.figure} — ${item.note}` : t('report.fmt.stickersEven')
})
const variety = computed(() => {
  const stats = stickers.value
  if (!stats?.distinct) return undefined
  const kinds = tc('report.talk.stickerKinds', stats.distinct)
  return stats.packs ? `${kinds} ${tc('report.talk.packs', stats.packs)}` : kinds
})
</script>

<template>
  <ReportSection v-if="stickers?.top.length" :title="t('report.talk.stickersTitle')" :text="variety" :answer="answer">
    <StickerGrid :stickers="stickers.top" />
    <ReportLine
      v-if="pair"
      :mine="pair.mine.value"
      :theirs="pair.theirs.value"
      :left="pair.mine.text"
      :right="pair.theirs.text"
    />
  </ReportSection>
</template>
