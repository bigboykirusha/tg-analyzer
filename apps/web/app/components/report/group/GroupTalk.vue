<script setup lang="ts">
import type { GroupReportDto, ReportDto } from '@tg-analyzer/shared'
import { Heart, MessageCircle, Quote, Sticker } from '../../../lib/icons'

/**
 * «Общение» in a group, card by card: the favourite reactions on a podium, who starts conversations, each
 * talker's own words and the stickers. The pairs have their own card, the shared words and emoji too.
 */
const props = defineProps<{ data: ReportDto; group: GroupReportDto }>()
const { t, tc, formatNumber, formatPercent } = useI18n()
const nameOf = useParticipantName()

const report = computed(() => props.data.report)
// Custom emoji have no picture here, so only regular ones are shown.
const reactions = computed(() =>
  (report.value.reactions?.top ?? []).filter((item) => item.value !== 'custom' && item.value !== 'paid').slice(0, 3),
)
const favourite = (emoji: string, count: number) =>
  tc('group.favouriteAnswer', count, { emoji, count: formatNumber(count) })

const starters = computed(() =>
  [...props.group.participants]
    .filter((person) => person.starterShare > 0)
    .sort((a, b) => b.starterShare - a.starterShare)
    .slice(0, 3),
)

/** Each talker's words as `derived` keeps them: the same source as every other word on the report. */
const signatureOf = (id: string) => props.data.derived.words.group?.members[id]?.topicSignature ?? []
const signatures = computed(() =>
  [...props.group.participants]
    .filter((person) => signatureOf(person.id).length)
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 4)
    .map((person) => ({
      person,
      words: signatureOf(person.id)
        .slice(0, 3)
        .map((word) => word.value)
        .join(', '),
    })),
)

const stickers = computed(() => report.value.stickers?.top ?? [])
const stickerAnswer = computed(() => {
  const first = stickers.value[0]
  if (!first) return null
  const count = first.mine + first.theirs
  return first.emoji ? favourite(first.emoji, count) : tc('group.stickerAnswer', count, { count: formatNumber(count) })
})
</script>

<template>
  <ReportSection
    v-if="reactions.length"
    :icon="Heart"
    :title="t('group.talk.reactionsTitle')"
    :answer="favourite(reactions[0]!.value, reactions[0]!.count)"
  >
    <ReportPodium :items="reactions" />
  </ReportSection>

  <ReportSection
    v-if="starters.length"
    :icon="MessageCircle"
    :title="t('group.startersTitle')"
    :answer="t('group.startersAnswer', { name: nameOf(starters[0]!) })"
  >
    <div class="rows">
      <UiListRow v-for="person in starters" :key="person.id" :title="nameOf(person)">
        <template #leading>
          <UiAvatar :title="nameOf(person)" :seed="person.id" :side="person.isSelf ? 'mine' : null" size="xs" />
        </template>
        <template #trailing
          ><span class="rows__value">{{ formatPercent(person.starterShare) }}</span></template
        >
      </UiListRow>
    </div>
  </ReportSection>

  <ReportSection v-if="signatures.length" :icon="Quote" :title="t('group.signatureTitle')">
    <ReportFacts
      :facts="signatures.map((item) => ({ key: item.person.id, label: nameOf(item.person), value: item.words }))"
    />
  </ReportSection>

  <ReportSection v-if="stickers.length" :icon="Sticker" :title="t('report.talk.stickersTitle')" :answer="stickerAnswer">
    <StickerGrid :stickers="stickers.slice(0, 8)" />
  </ReportSection>
</template>

<style scoped>
.rows > :deep(:last-child .list-row__body) {
  box-shadow: none;
}

.rows__value {
  color: var(--text);
  font: var(--text-label);
}

/* Two small avatars, the second overlapping the first. */
.duo {
  display: inline-flex;
}

.duo > :last-child {
  margin-left: calc(-1 * var(--space-2));
  box-shadow: var(--ring-cutout);
}
</style>
