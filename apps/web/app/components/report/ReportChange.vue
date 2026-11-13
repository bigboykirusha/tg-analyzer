<script setup lang="ts">
import { HOME_MIN_NEW_MESSAGES, type ReportDto } from '@tg-analyzer/shared'
import { RotateCw } from '../../lib/icons'
import { nbsp } from '../../lib/nbsp'

/**
 * «Что изменилось», a quiet badge on the poster and nothing when nothing did:
 *   - the report is being refreshed (or waits for its turn) — «Обновляем отчёт, 63%», a press opens the running
 *     analysis; «Обновить» from «⋯» answers here, on the report itself, not only on home;
 *   - Telegram has more messages than the report has read — «+640 новых», «Обновить»; when only the date of the
 *     newest message says so (a group, a chat outside the month's list) — «Есть новые сообщения», «Обновить»;
 *   - otherwise, after a fresh analysis, the new messages and only the values that really moved
 *     («ваш ответ: 5 мин → 3 мин»); a value that stayed the same is not mentioned.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatDuration, formatDate } = useI18n()
const workspace = useWorkspaceStore()
const actions = useReportActions()
const analysis = useAnalysis()
const view = useAnalysisView()

/** This report's chat is being read again, waits in the queue, or the request has just left. */
const refreshing = computed(() => {
  const chatId = props.data.summary.chatId
  if (analysis.isActive.value && analysis.progress.value.chatId === chatId) {
    const percent = view.value?.percent
    return percent === null || percent === undefined
      ? t('report.change.refreshing')
      : t('report.change.refreshingAt', { percent: formatNumber(percent) })
  }
  if (analysis.queued.value.some((item) => item.chatId === chatId)) return t('report.change.queued')
  return actions.starting.value === chatId ? t('report.change.refreshing') : null
})

onMounted(() => {
  if (workspace.recentState === 'idle') void workspace.loadRecent()
})

/** Messages in Telegram that the report has not read: the chat's size now minus the report's. */
const unread = computed(() => {
  const chat = workspace.recent?.chats.find((item) => item.id === props.data.summary.chatId)
  if (chat?.total === undefined) return 0
  const added = chat.total - props.data.summary.totalMessages
  return added >= HOME_MIN_NEW_MESSAGES ? added : 0
})

/** «вы», «Мила» or «поровну»: who starts more, as the balance says it. */
function starter(pct: number) {
  if (isEvenShare(pct)) return t('report.change.even')
  return pct > 50 ? t('report.you').toLocaleLowerCase() : props.data.summary.title
}
const isEvenShare = (pct: number) => {
  const high = Math.max(pct, 100 - pct)
  const low = Math.min(pct, 100 - pct)
  return low > 0 ? high / low < 1.25 : false
}

/** The chat has moved on since the report, even where its size is not known (groups). */
const fresh = computed(() => Boolean(workspace.withNews[props.data.summary.chatId]))

const since = computed(() => {
  const before = props.data.report.group ? null : props.data.previous
  if (!before) return null
  const { totals, responses } = props.data.report
  const added = totals.messages - before.messages
  if (added <= 0) return null
  const changes: string[] = []
  if (responses.medianMineSec !== null && before.medianMineSec !== null) {
    const from = formatDuration(before.medianMineSec)
    const to = formatDuration(responses.medianMineSec)
    if (from !== to) changes.push(t('report.change.reply', { from, to }))
  }
  if (responses.iWriteFirstPct !== null && before.iWriteFirstPct !== null) {
    const from = starter(before.iWriteFirstPct)
    const to = starter(responses.iWriteFirstPct)
    if (from !== to) changes.push(t('report.change.starts', { from, to }))
  }
  // A handful of new messages with nothing moved is not news.
  if (added < HOME_MIN_NEW_MESSAGES && !changes.length) return null
  const date = formatDate(before.analyzedAt, { day: 'numeric', month: 'long' })
  return nbsp([t('report.change.added', { count: formatNumber(added), date }), ...changes].join(', '))
})
</script>

<template>
  <button
    v-if="refreshing"
    type="button"
    class="change change--busy"
    aria-haspopup="dialog"
    @click="analysis.details.value = true"
  >
    <span class="spinner" aria-hidden="true" />
    <span class="change__text t-label" role="status">{{ refreshing }}</span>
  </button>
  <div v-else-if="unread || fresh" class="change" role="status">
    <span class="change__text t-label">{{
      unread ? t('report.change.unread', { count: formatNumber(unread) }) : t('report.change.fresh')
    }}</span>
    <UiButton
      variant="secondary"
      size="sm"
      :icon="RotateCw"
      @click="actions.analyse(data.summary.chatId, data.summary.title)"
    >
      {{ t('report.change.refresh') }}
    </UiButton>
  </div>
  <p v-else-if="since" class="change change__text t-label" role="status">{{ since }}</p>
</template>

<style scoped>
.change {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  min-width: 0;
}

.change__text {
  color: var(--text);
}

/* Being refreshed: the same quiet line with the one spinner; the whole line opens the running analysis. */
.change--busy {
  align-self: flex-start;
  min-height: var(--control-sm);
  color: var(--text);
  text-align: left;
}
</style>
