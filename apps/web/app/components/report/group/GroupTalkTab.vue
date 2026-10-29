<script setup lang="ts">
import type { GroupParticipantDto, GroupReportDto, MilestoneDto, ReportDto } from '@tg-analyzer/shared'
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

const byId = computed(() => new Map(props.group.participants.map((participant) => [participant.id, participant])))
const milestoneAuthors = computed(() =>
  (report.value.milestones ?? []).map((milestone: MilestoneDto) => {
    const participant = milestone.senderId ? byId.value.get(milestone.senderId) : undefined
    return participant ? nameOf(participant) : milestone.mine ? t('group.you') : t('group.unknownParticipant')
  }),
)
</script>

<template>
  <div class="report-grid">
    <div v-if="outdated" class="banner talk-banner" role="status">
      <Info aria-hidden="true" />
      <p class="banner__text">{{ t('report.talk.outdated') }}</p>
    </div>

    <template v-else>
      <ReportSection :title="t('group.talk.morningTitle')" :text="t('group.talk.morningText')">
        <ReportMeters v-if="wakers.length" :meters="wakers" />
        <p v-else class="t-small t-muted">{{ t('report.talk.noRituals') }}</p>
      </ReportSection>

      <ReportSection :title="t('group.talk.nightTitle')" :text="t('group.talk.nightText')">
        <ReportMeters v-if="closers.length" :meters="closers" />
        <p v-else class="t-small t-muted">{{ t('report.talk.noRituals') }}</p>
      </ReportSection>

      <ReportSection :title="t('group.talk.reactionsTitle')" :text="t('group.talk.reactionsText')">
        <ReportMeters v-if="reactionStars.length" :meters="reactionStars" />
        <p v-else class="t-small t-muted">{{ t('report.talk.noReactions') }}</p>
        <div v-if="topReactions.length" class="reactions">
          <span class="t-label">{{ t('group.talk.topReactions') }}</span>
          <EmojiGrid :items="topReactions" />
        </div>
      </ReportSection>

      <ReportSection :title="t('group.talk.voiceTitle')" :text="t('report.talk.voiceText')">
        <ReportMeters v-if="voice.length" :meters="voice" />
        <p v-else class="t-small t-muted">{{ t('report.talk.noVoice') }}</p>
      </ReportSection>

      <ReportSection wide :title="t('report.talk.stickersTitle')" :text="t('report.talk.stickersText')">
        <StickerGrid v-if="stickers?.top.length" :stickers="stickers.top" />
        <p v-else class="t-small t-muted">{{ t('report.talk.noStickers') }}</p>
      </ReportSection>

      <ReportSection
        v-if="report.milestones?.length"
        wide
        :title="t('report.talk.milestonesTitle')"
        :text="t('report.talk.milestonesText')"
      >
        <ReportMilestones :milestones="report.milestones" :authors="milestoneAuthors" />
      </ReportSection>
    </template>
  </div>
</template>

<style scoped>
.talk-banner {
  grid-column: 1 / -1;
}

.reactions {
  display: grid;
  gap: var(--space-2);
}
</style>
