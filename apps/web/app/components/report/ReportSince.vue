<script setup lang="ts">
import { HOME_MIN_NEW_MESSAGES, type ReportDto } from '@tg-analyzer/shared'
import { RotateCw } from '../../lib/icons'

/**
 * One white strip under the poster, only when there is news about the report itself:
 *   - Telegram has many messages the report has not read yet — «640 новых сообщений», «Обновить»;
 *   - otherwise, right after a fresh analysis, what changed since the previous one — how many messages
 *     came and, «было → стало», your reply time and who starts.
 * Nothing new — no strip.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatDuration, formatDate } = useI18n()
const workspace = useWorkspaceStore()
const actions = useReportActions()

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

/** «вы», «Мила» or «поровну»: who starts more, from the share of conversations you start. */
function starter(pct: number) {
  if (pct > 55) return t('report.since.starterMine')
  if (pct < 45) return props.data.summary.title
  return t('report.since.starterEven')
}

const since = computed(() => {
  const before = props.data.report.group ? null : props.data.previous
  if (!before) return null
  const { totals, responses } = props.data.report
  const added = totals.messages - before.messages
  if (added <= 0) return null
  const changes: string[] = []
  if (responses.medianMineSec !== null && before.medianMineSec !== null)
    changes.push(
      t('report.since.reply', {
        from: formatDuration(before.medianMineSec),
        to: formatDuration(responses.medianMineSec),
      }),
    )
  if (responses.iWriteFirstPct !== null && before.iWriteFirstPct !== null)
    changes.push(
      t('report.since.starts', { from: starter(before.iWriteFirstPct), to: starter(responses.iWriteFirstPct) }),
    )
  return {
    title: tc('report.since.added', added, {
      count: formatNumber(added),
      date: formatDate(before.analyzedAt, { day: 'numeric', month: 'long' }),
    }),
    text: changes.join(', ').replace(/^./u, (letter) => letter.toLocaleUpperCase()),
  }
})
</script>

<template>
  <div v-if="unread" class="tile since" role="status">
    <span class="since__copy">
      <b class="since__title">{{ tc('report.stale.title', unread, { count: formatNumber(unread) }) }}</b>
      <span class="since__text">{{ t('report.stale.text') }}</span>
    </span>
    <UiButton
      variant="secondary"
      size="sm"
      :icon="RotateCw"
      :loading="actions.busy(data.summary.chatId)"
      @click="actions.analyse(data.summary.chatId, data.summary.title)"
    >
      {{ t('report.stale.refresh') }}
    </UiButton>
  </div>
  <div v-else-if="since" class="tile since">
    <span class="since__copy">
      <b class="since__title">{{ since.title }}</b>
      <span v-if="since.text" class="since__text">{{ since.text }}</span>
    </span>
  </div>
</template>

<style scoped>
.since {
  flex-direction: row;
  align-items: center;
  gap: var(--space-3);
}

.since__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-0-5);
  min-width: 0;
}

.since__title {
  font: var(--text-small-strong);
}

.since__text {
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
