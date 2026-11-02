<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../../lib/icons'

/** What the two of you send besides words. Who does more lives in «Кто есть кто». */
const props = defineProps<{ data: ReportDto }>()
const { t, tc } = useI18n()

const report = computed(() => props.data.report)
const outdated = computed(() => !report.value.voice || !report.value.rituals)

const stickers = computed(() => report.value.stickers)
const versus = useVersus(() => props.data)
const stickerVariety = computed(() => {
  const stats = stickers.value
  if (!stats?.distinct) return null
  const kinds = tc('report.talk.stickerKinds', stats.distinct)
  return stats.packs ? `${kinds} ${tc('report.talk.packs', stats.packs)}` : kinds
})

/** Sections with nothing to show collapse into one quiet line at the end of the part. */
const absent = computed(() =>
  [
    !report.value.voice?.voice.count.mine &&
      !report.value.voice?.voice.count.theirs &&
      !report.value.voice?.round.count.mine &&
      !report.value.voice?.round.count.theirs &&
      t('report.talk.missingVoice'),
    !report.value.reactions && t('report.talk.missingReactions'),
    !stickers.value?.top.length && t('report.talk.missingStickers'),
  ].filter((item): item is string => Boolean(item)),
)
</script>

<template>
  <p v-if="outdated" class="note" role="status">
    <Info aria-hidden="true" />
    {{ t('report.talk.outdated') }}
  </p>

  <template v-else>
    <ReportShared :data="data" />

    <ReportEquivalents :data="data" />

    <ReportSection
      v-if="stickers?.top.length"
      wide
      :title="t('report.talk.stickersTitle')"
      :text="stickerVariety ?? undefined"
    >
      <p v-if="versus.stickers?.note" class="sticker-lead">
        <b>{{ versus.stickers.figure }}</b> {{ versus.stickers.note }}
      </p>
      <StickerGrid :stickers="stickers.top" />
    </ReportSection>

    <p v-if="absent.length" class="note">
      <Info aria-hidden="true" />
      <span>{{ t('report.talk.missing', { items: absent.join(', ') }) }}</span>
    </p>
  </template>
</template>

<style scoped>
.sticker-lead {
  color: var(--text-muted);
  font: var(--text-ui);
}

.sticker-lead b {
  color: var(--text);
}
</style>
