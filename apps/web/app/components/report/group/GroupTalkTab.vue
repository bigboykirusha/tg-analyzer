<script setup lang="ts">
import type { GroupParticipantDto, GroupReportDto, ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../../lib/icons'
import type { Meter } from '../ReportMeters.vue'

const props = defineProps<{ data: ReportDto; group: GroupReportDto }>()
const { t, tc, formatDuration } = useI18n()
const nameOf = useParticipantName()

const TOP = 5

const report = computed(() => props.data.report)
const outdated = computed(() => !report.value.rituals || !report.value.voice)

type Count = 'voice' | 'reactionsReceived' | 'morningFirst' | 'nightLast'

function amount(participant: GroupParticipantDto, count: Count) {
  if (count === 'voice') return (participant.voiceSeconds ?? 0) + (participant.roundSeconds ?? 0)
  return participant[count] ?? 0
}

function describe(value: number, count: Count) {
  if (count === 'voice') return formatDuration(value)
  if (count === 'reactionsReceived') return tc('report.talk.reactionCount', value)
  return tc(count === 'morningFirst' ? 'report.talk.mornings' : 'report.talk.evenings', value)
}

/** The members with the most of `count`, as shares of the whole group. */
function leaders(count: Count): Meter[] {
  const total = props.group.participants.reduce((sum, participant) => sum + amount(participant, count), 0)
  if (!total) return []
  return props.group.participants
    .filter((participant) => amount(participant, count) > 0)
    .sort((left, right) => amount(right, count) - amount(left, count))
    .slice(0, TOP)
    .map((participant) => ({
      key: participant.id,
      label: nameOf(participant),
      value: (amount(participant, count) / total) * 100,
      detail: describe(amount(participant, count), count),
      self: participant.isSelf,
    }))
}

const voice = computed(() => leaders('voice'))
const reactionStars = computed(() => leaders('reactionsReceived'))
const wakers = computed(() => leaders('morningFirst'))
const closers = computed(() => leaders('nightLast'))
const topReactions = computed(() =>
  (report.value.reactions?.top ?? []).filter((item) => item.value !== 'custom' && item.value !== 'paid').slice(0, 8),
)
const stickers = computed(() => report.value.stickers)

/** Sections with nothing to show collapse into one quiet line at the end. */
const absent = computed(() =>
  [
    !wakers.value.length && !closers.value.length && t('report.talk.missingRituals'),
    !reactionStars.value.length && !topReactions.value.length && t('report.talk.missingReactions'),
    !voice.value.length && t('report.talk.missingVoice'),
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
    <ReportSection v-if="wakers.length" :title="t('group.talk.morningTitle')" :text="t('group.talk.morningText')">
      <ReportMeters :meters="wakers" />
    </ReportSection>

    <ReportSection v-if="closers.length" :title="t('group.talk.nightTitle')" :text="t('group.talk.nightText')">
      <ReportMeters :meters="closers" />
    </ReportSection>

    <ReportSection
      v-if="reactionStars.length || topReactions.length"
      :title="t('group.talk.reactionsTitle')"
      :text="t('group.talk.reactionsText')"
    >
      <ReportMeters v-if="reactionStars.length" :meters="reactionStars" />
      <div v-if="topReactions.length" class="reactions">
        <span class="t-label">{{ t('group.talk.topReactions') }}</span>
        <EmojiGrid :items="topReactions" />
      </div>
    </ReportSection>

    <ReportSection v-if="voice.length" :title="t('group.talk.voiceTitle')" :text="t('report.talk.voiceText')">
      <ReportMeters :meters="voice" />
    </ReportSection>

    <ReportSection
      v-if="stickers?.top.length"
      wide
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
.reactions {
  display: grid;
  gap: var(--space-2);
}
</style>
