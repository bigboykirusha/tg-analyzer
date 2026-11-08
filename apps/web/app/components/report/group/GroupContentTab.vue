<script setup lang="ts">
import { hueOf } from '../../../lib/hue'
import type { GroupReportDto, ReportDto } from '@tg-analyzer/shared'

/**
 * «О чём» in a group: one card for the words — the ones most of the active members use («Общий
 * словарь», chips), then under a second quiet line each talker's own words («Фирменные слова»: the
 * name in their colour, three words as plain text) — and the popular emoji.
 */
const props = defineProps<{ data: ReportDto; group: GroupReportDto }>()
const { t, tc, formatNumber } = useI18n()
const nameOf = useParticipantName()

const top = computed(() => props.group.sharedVocabulary[0] ?? null)
/** The first shared word answers the card; the chips go on from the second, so no word is said twice. */
const shared = computed(() => props.group.sharedVocabulary.slice(1, 11))
const wordAnswer = computed(() => (top.value ? t('group.sharedVocabularyAnswer', { word: top.value.value }) : null))
const emoji = computed(() => props.data.report.vocabulary.topEmoji.slice(0, 12))
const emojiAnswer = computed(() => {
  const first = emoji.value[0]
  return first
    ? tc('group.favouriteAnswer', first.count, { emoji: first.value, count: formatNumber(first.count) })
    : null
})
const signatures = computed(() =>
  [...props.group.participants]
    .filter((p) => p.topicSignature.length)
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 5)
    .map((p) => ({
      ...p,
      words: p.topicSignature
        .slice(0, 3)
        .map((word) => word.value)
        .join(', '),
    })),
)
</script>

<template>
  <ReportSection v-if="top || signatures.length" :title="t('group.sharedVocabulary')" :answer="wordAnswer">
    <WordChips v-if="shared.length" :items="shared" :empty="t('group.noWords')" :counts="false" />
    <div v-if="signatures.length" class="signatures">
      <h4 class="signatures__title">{{ t('group.signatures') }}</h4>
      <div v-for="p in signatures" :key="p.id" class="signature">
        <strong :data-hue="p.isSelf ? undefined : hueOf(p.id)" :class="{ signature__you: p.isSelf }">{{
          nameOf(p)
        }}</strong>
        <span>{{ p.words }}</span>
      </div>
    </div>
  </ReportSection>

  <ReportSection v-if="emoji.length" :title="t('group.topEmoji')" :answer="emojiAnswer">
    <EmojiGrid :items="emoji" />
  </ReportSection>
</template>

<style scoped>
/* The second question of the card, as quiet as the first. */
.signatures {
  display: grid;
}

.signatures__title {
  margin-bottom: var(--space-1);
  color: var(--text-muted);
  font: var(--text-ui);
}

/* One row per person, divided by hairlines: the name in their colour, their words under it. */
.signature {
  display: grid;
  gap: var(--space-0-5);
  padding-block: var(--space-3);
  box-shadow: var(--divider-top);
}

.signature:last-child {
  padding-bottom: 0;
}

.signature strong {
  overflow: hidden;
  color: var(--them-ink);
  font: var(--text-ui);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.signature strong.signature__you {
  color: var(--you);
}

.signature span {
  color: var(--text);
  font: var(--text-ui);
  font-weight: 400;
  overflow-wrap: anywhere;
}
</style>
