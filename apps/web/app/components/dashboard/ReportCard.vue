<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'

/**
 * A report on home: the card of every home screen — the avatar, the name, how many messages, the pulse in the
 * person's colour. A chat that has moved on since the report says so in the quiet line, after the count, in the
 * poster's ink at full strength («4 800 сообщений · есть новые»; the exact count is on the report itself), for
 * private chats and groups alike. The whole card opens the report; «Обновить», «Поделиться» and «Удалить» are the
 * report's own (its bar), not the tile's. On a phone the tile is the whole row (`wide`): the avatar and the
 * name beside each other, the pulse under them.
 */
const props = defineProps<{ report: ReportSummaryDto; hasAvatar?: boolean; fresh?: boolean }>()
const { t, tc, formatNumber } = useI18n()
const actions = useReportActions()
const view = useAnalysisView()
const updating = computed(() => actions.busy(props.report.chatId))
/**
 * Read again right now, on a computer: the tile grows anew, its pulse drawn from what is read this time (as
 * AnalysisTile). A phone shows it in the bottom panel (AnalysisPill), so the tile only says it is being analysed.
 */
const computer = useMediaQuery('(min-width: 901px)')
const reading = computed(() => (computer.value && view.value?.chatId === props.report.chatId ? view.value : null))
/** Only how many messages: a tile does not say «Группа» (13.11) — the name and the avatar tell a group already. */
const meta = computed(() =>
  tc('common.messagesCount', props.report.totalMessages, { count: formatNumber(props.report.totalMessages) }),
)
/** New messages since the report; not while it is being read again. */
const news = computed(() => props.fresh && !updating.value)
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
    wide
  >
    <template #meta>
      <template v-if="reading">{{ reading.short }}</template>
      <template v-else-if="updating"
        ><span class="spinner" aria-hidden="true" /> {{ t('dashboard.analysingNow') }}</template
      >
      <template v-else
        >{{ meta
        }}<template v-if="news">
          · <span class="report-card__news">{{ t('dashboard.hasNews') }}</span></template
        ></template
      >
    </template>
    <Pulse v-if="reading" :data="reading.pulse" :height="0" :bars="48" :pitch="6" :read="reading.share" />
    <Pulse v-else-if="pulse" :data="pulse" :height="0" :bars="48" :pitch="6" grow />
  </HomeCard>
</template>

<style scoped>
/* News reads as news: the poster's ink at full strength, a step heavier than the quiet line around it. */
.report-card__news {
  color: var(--on-poster);
  font-weight: 600;
}
</style>
