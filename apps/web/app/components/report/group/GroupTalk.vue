<script setup lang="ts">
import type { GroupParticipantDto, GroupReportDto, ReportDto } from '@tg-analyzer/shared'

/**
 * «Общение» in a group, card by card into the part's masonry: the closest pairs, the favourite
 * reactions on a podium, who starts conversations, the words most members share with each talker's
 * own, the favourite emoji and stickers.
 */
const props = defineProps<{ data: ReportDto; group: GroupReportDto }>()
const { t, tc, formatNumber, formatPercent } = useI18n()
const nameOf = useParticipantName()

const report = computed(() => props.data.report)
const byId = computed(() => new Map(props.group.participants.map((person) => [person.id, person])))
const member = (id: string, name: string): Pick<GroupParticipantDto, 'id' | 'name' | 'isSelf'> =>
  byId.value.get(id) ?? { id, name, isSelf: false }

const pairs = computed(() =>
  props.group.topPairs.slice(0, 3).map((pair) => ({
    key: `${pair.leftParticipantId}-${pair.rightParticipantId}`,
    left: member(pair.leftParticipantId, pair.leftParticipantName),
    right: member(pair.rightParticipantId, pair.rightParticipantName),
    score: pair.symmetricScore,
  })),
)
const pairName = (pair: { left: { name: string; isSelf?: boolean }; right: { name: string; isSelf?: boolean } }) =>
  t('group.pairs.names', { left: nameOf(pair.left), right: nameOf(pair.right) })

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

const topWord = computed(() => props.group.sharedVocabulary[0] ?? null)
/** The first shared word answers the card; the chips go on from the second, so no word is said twice. */
const shared = computed(() => props.group.sharedVocabulary.slice(1, 11))
const signatures = computed(() =>
  [...props.group.participants]
    .filter((person) => person.topicSignature.length)
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 4)
    .map((person) => ({
      person,
      words: person.topicSignature
        .slice(0, 3)
        .map((word) => word.value)
        .join(', '),
    })),
)

const emoji = computed(() => report.value.vocabulary.topEmoji.slice(0, 8))
const stickers = computed(() => report.value.stickers?.top ?? [])
const stickerAnswer = computed(() => {
  const first = stickers.value[0]
  if (!first) return null
  const count = first.mine + first.theirs
  return first.emoji ? favourite(first.emoji, count) : tc('group.stickerAnswer', count, { count: formatNumber(count) })
})
</script>

<template>
  <ReportSection v-if="pairs.length" :title="t('group.networkTitle')" :answer="pairName(pairs[0]!)">
    <div class="rows">
      <UiListRow
        v-for="(pair, index) in pairs"
        :key="pair.key"
        :title="pairName(pair)"
        :subtitle="index === 0 ? t('group.pairs.lead') : ''"
      >
        <template #leading>
          <span class="duo">
            <UiAvatar
              :title="nameOf(pair.left)"
              :seed="pair.left.id"
              :side="pair.left.isSelf ? 'mine' : null"
              size="xs"
            />
            <UiAvatar
              :title="nameOf(pair.right)"
              :seed="pair.right.id"
              :side="pair.right.isSelf ? 'mine' : null"
              size="xs"
            />
          </span>
        </template>
        <template #trailing
          ><span class="rows__value">{{ formatNumber(pair.score) }}</span></template
        >
      </UiListRow>
    </div>
  </ReportSection>

  <ReportSection
    v-if="reactions.length"
    :title="t('group.talk.reactionsTitle')"
    :answer="favourite(reactions[0]!.value, reactions[0]!.count)"
  >
    <ReportPodium :items="reactions" />
  </ReportSection>

  <ReportSection
    v-if="starters.length"
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

  <ReportSection
    v-if="topWord || signatures.length"
    :title="t('group.sharedVocabulary')"
    :answer="topWord ? t('group.sharedVocabularyAnswer', { word: topWord.value }) : null"
  >
    <WordChips v-if="shared.length" :items="shared" :counts="false" tone="shared" />
    <ReportFacts
      v-if="signatures.length"
      :facts="signatures.map((item) => ({ key: item.person.id, label: nameOf(item.person), value: item.words }))"
    />
  </ReportSection>

  <ReportSection v-if="emoji.length" :title="t('group.topEmoji')" :answer="favourite(emoji[0]!.value, emoji[0]!.count)">
    <WordChips :items="emoji" tone="shared" />
  </ReportSection>

  <ReportSection v-if="stickers.length" :title="t('report.talk.stickersTitle')" :answer="stickerAnswer">
    <StickerGrid :stickers="stickers.slice(0, 8)" />
  </ReportSection>
</template>

<style scoped>
.rows > :deep(:last-child .list-row__body) {
  box-shadow: none;
}

.rows__value {
  color: var(--text);
  font: var(--text-small-strong);
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
