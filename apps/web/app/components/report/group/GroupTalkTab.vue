<script setup lang="ts">
import type { GroupReportDto, ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../../lib/icons'

const props = defineProps<{ data: ReportDto; group: GroupReportDto }>()
const { t, tc, formatNumber } = useI18n()

const report = computed(() => props.data.report)
const outdated = computed(() => !report.value.rituals || !report.value.voice)

const topReactions = computed(() =>
  (report.value.reactions?.top ?? []).filter((item) => item.value !== 'custom' && item.value !== 'paid').slice(0, 8),
)
/** The podium: second, first, third — the favourite in the middle and tallest, in the group's colour. */
const podium = computed(() => {
  const [first, second, third] = topReactions.value
  if (!first) return []
  const max = first.count
  return [second && { ...second, place: 2 }, { ...first, place: 1 }, third && { ...third, place: 3 }]
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({ ...item, height: Math.max(24, (item.count / max) * 100) }))
})
const reactionAnswer = computed(() => {
  const first = topReactions.value[0]
  return first
    ? tc('group.talk.reactionsAnswer', first.count, { emoji: first.value, count: formatNumber(first.count) })
    : null
})
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
    <ReportSection v-if="topReactions.length" :title="t('group.talk.reactionsTitle')" :answer="reactionAnswer">
      <ol
        class="podium"
        :aria-label="
          topReactions
            .slice(0, 3)
            .map((item) => `${item.value} ${item.count}`)
            .join(', ')
        "
      >
        <li
          v-for="item in podium"
          :key="item.value"
          class="podium__place"
          :class="{ 'podium__place--first': item.place === 1 }"
        >
          <span class="podium__emoji t-emoji" aria-hidden="true">{{ item.value }}</span>
          <span class="podium__bar t-num" :style="{ height: `${item.height}%` }">{{ formatNumber(item.count) }}</span>
        </li>
      </ol>
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

<style scoped>
.podium {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: end;
  gap: var(--space-2);
  width: min(100%, calc(var(--space-20) * 3));
  height: calc(var(--space-20) * 2);
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

.podium__place {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}

.podium__bar {
  display: grid;
  width: 100%;
  min-height: var(--space-8);
  place-items: start center;
  padding-top: var(--space-2);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  background: var(--room-tint);
  font: var(--text-caption);
  font-weight: 600;
}

.podium__place--first .podium__bar {
  background: var(--them);
  color: var(--on-them);
}
</style>
