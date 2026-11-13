<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'

/**
 * A report on home: the card of every home screen — the avatar, the name, how many messages, the pulse in the
 * person's colour. A chat that has moved on since the report carries a quiet mark «Есть новые» (the exact count is
 * on the report itself), for private chats and groups alike. The whole card opens
 * the report; «Обновить», «Поделиться» and «Удалить» are the report's own (its bar), not the tile's. On a phone
 * tiles stand two to a row; `wide` (a name too long for a half tile, or a tile without a neighbour — useTileRows)
 * takes the whole row: the avatar, the name and the badge on one line, the pulse under them.
 */
const props = defineProps<{ report: ReportSummaryDto; hasAvatar?: boolean; fresh?: boolean; wide?: boolean }>()
const { t, tc, formatNumber } = useI18n()
const actions = useReportActions()
const updating = computed(() => actions.busy(props.report.chatId))
/** Only how many messages: a tile does not say «Группа» (13.11) — the name and the avatar tell a group already. */
const meta = computed(() =>
  tc('common.messagesCount', props.report.totalMessages, { count: formatNumber(props.report.totalMessages) }),
)
const pulse = computed(() =>
  props.report.pulse?.some((week) => week.sent || week.received) ? props.report.pulse : null,
)
</script>

<template>
  <HomeCard
    class="report-card"
    :chat-id="report.chatId"
    :title="report.title"
    :has-avatar="hasAvatar"
    poster
    :to="`/chat/${report.chatId}`"
    :wide="wide"
  >
    <template #end>
      <span v-if="fresh && !updating" class="report-card__badge t-caption">{{ t('dashboard.hasNews') }}</span>
    </template>
    <template #meta>
      <template v-if="updating"><span class="spinner" aria-hidden="true" /> {{ t('dashboard.analysingNow') }}</template>
      <template v-else>{{ meta }}</template>
    </template>
    <Pulse v-if="pulse" :data="pulse" :height="0" :bars="48" :pitch="6" grow />
  </HomeCard>
</template>

<style scoped>
/* New messages: a quiet chip of poster ink at the end of the tile's first line. */
.report-card__badge {
  padding: var(--space-0-5) var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--on-poster-chip);
  color: var(--on-poster);
  white-space: nowrap;
}
</style>
