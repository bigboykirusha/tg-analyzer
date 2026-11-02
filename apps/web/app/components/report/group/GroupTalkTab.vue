<script setup lang="ts">
import type { GroupReportDto, ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../../lib/icons'

const props = defineProps<{ data: ReportDto; group: GroupReportDto }>()
const { t } = useI18n()

const report = computed(() => props.data.report)
const outdated = computed(() => !report.value.rituals || !report.value.voice)

const topReactions = computed(() =>
  (report.value.reactions?.top ?? []).filter((item) => item.value !== 'custom' && item.value !== 'paid').slice(0, 8),
)
const stickers = computed(() => report.value.stickers)

/** Sections with nothing to show collapse into one quiet line at the end. */
const absent = computed(() =>
  [
    !topReactions.value.length && t('report.talk.missingReactions'),
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
    <ReportSection
      v-if="topReactions.length"
      tone="lime"
      :title="t('group.talk.reactionsTitle')"
      :text="t('group.talk.reactionsText')"
    >
      <EmojiGrid :items="topReactions" />
    </ReportSection>

    <ReportSection
      v-if="stickers?.top.length"
      :title="t('report.talk.stickersTitle')"
      :text="t('report.talk.stickersText')"
    >
      <StickerGrid :stickers="stickers.top" />
    </ReportSection>

    <p v-if="absent.length" class="note">
      <Info aria-hidden="true" />
      {{ t('report.talk.missing', { items: absent.join(', ') }) }}
    </p>
  </template>
</template>
