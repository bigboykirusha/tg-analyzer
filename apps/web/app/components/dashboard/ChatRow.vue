<script setup lang="ts">
import type { WorkspaceChat } from '../../stores/workspace'
import { RotateCw, Share, Trash2 } from '../../lib/icons'

/**
 * One Telegram chat in «Новый анализ»: avatar, name, one quiet line, one action. A chat with a report is
 * a link to it (chevron); without one, «Разобрать». While it is read, the percentage and «Отменить»; a report
 * finished a moment ago says «Отчёт готов» in the row itself, not only in a toast that goes away. A chat Telegram
 * says is too small for a report has no button: «Мало сообщений».
 * As in Telegram, a long press (450 ms) or a right click opens the row's menu.
 */
const props = defineProps<{ chat: WorkspaceChat }>()
const { t, formatRelative } = useI18n()
const actions = useReportActions()
const analysis = useAnalysis()
const view = useAnalysisView()
const menuOpen = ref(false)
const now = useNow(30_000)

const analysing = computed(() => analysis.isActive.value && analysis.progress.value.chatId === props.chat.id)
const queuedJob = computed(() => analysis.queued.value.find((item) => item.chatId === props.chat.id)?.jobId ?? null)
const READY_MS = 3 * 60_000
const justReady = computed(() => !!props.chat.report && now.value - Date.parse(props.chat.report.analyzedAt) < READY_MS)
const tooSmall = computed(() => !!props.chat.tooSmall && !props.chat.report)
const meta = computed(() => {
  const group = props.chat.type !== 'private'
  if (justReady.value) return t('dashboard.reportReady')
  if (tooSmall.value) return t('newAnalysis.tooSmall')
  if (props.chat.report) {
    const line = t('dashboard.analysed', { time: formatRelative(props.chat.report.analyzedAt) })
    return group ? t('sidebar.groupMeta', { count: line.toLocaleLowerCase() }) : line
  }
  const time = props.chat.lastMessageAt ? formatRelative(props.chat.lastMessageAt) : null
  const line = time ? t('newAnalysis.wrote', { time }) : ''
  return group ? (line ? t('sidebar.groupMeta', { count: line.toLocaleLowerCase() }) : t('chatType.group')) : line
})

const PRESS_MS = 450
let pressTimer: ReturnType<typeof setTimeout> | undefined
let pressStart: { x: number; y: number } | null = null
let swallow = false
function pressDown(event: PointerEvent) {
  if (!props.chat.report || event.pointerType === 'mouse') return
  pressStart = { x: event.clientX, y: event.clientY }
  pressTimer = setTimeout(() => {
    swallow = true
    menuOpen.value = true
  }, PRESS_MS)
}
function pressMove(event: PointerEvent) {
  if (pressStart && Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > 8) pressCancel()
}
function pressCancel() {
  clearTimeout(pressTimer)
  pressStart = null
}
function onClick(event: MouseEvent) {
  if (!swallow) return
  swallow = false
  event.preventDefault()
}
function openMenu(event: MouseEvent) {
  if (!props.chat.report) return
  event.preventDefault()
  menuOpen.value = true
}
function run(action: 'refresh' | 'share' | 'delete') {
  menuOpen.value = false
  if (action === 'refresh') void actions.analyse(props.chat.id, props.chat.title)
  else if (action === 'share') void navigateTo({ path: `/chat/${props.chat.id}`, query: { share: null } })
  else actions.askDelete(props.chat.id)
}
onBeforeUnmount(() => clearTimeout(pressTimer))
</script>

<template>
  <UiPopoverMenu v-model:open="menuOpen" class="chat-row-menu" align="end" :aria-label="chat.title" :title="chat.title">
    <template #trigger>
      <UiListRow
        class="chat-row"
        :to="chat.report ? `/chat/${chat.id}` : undefined"
        :title="chat.title"
        :subtitle="meta"
        :class="{ 'chat-row--ready': justReady && !analysing && !queuedJob }"
        :chevron="!!chat.report && !analysing && !queuedJob"
        @contextmenu="openMenu"
        @pointerdown="pressDown"
        @pointermove="pressMove"
        @pointerup="pressCancel"
        @pointercancel="pressCancel"
        @click.capture="onClick"
      >
        <template #leading>
          <ChatAvatar :chat-id="chat.id" :title="chat.title" :has-avatar="chat.hasAvatar" />
        </template>
        <template v-if="queuedJob" #trailing>
          <UiButton variant="secondary" size="sm" @click.prevent="analysis.cancel(queuedJob)">
            {{ t('dashboard.queued') }}
          </UiButton>
        </template>
        <template v-else-if="analysing" #trailing>
          <span class="chat-row__percent">{{ view?.percent !== null && view ? `${view.percent}%` : '' }}</span>
          <span class="spinner" aria-hidden="true" />
        </template>
        <template v-else-if="!chat.report && !tooSmall" #trailing>
          <UiButton
            size="sm"
            :loading="actions.starting.value === chat.id"
            :aria-label="t('home.unanalysedAction', { name: chat.title })"
            @click="actions.analyse(chat.id, chat.title)"
          >
            {{ t('dashboard.analyse') }}
          </UiButton>
        </template>
      </UiListRow>
    </template>
    <UiMenuItem role="menuitem" :icon="RotateCw" @click="run('refresh')">{{ t('dashboard.reanalyse') }}</UiMenuItem>
    <UiMenuItem v-if="chat.type === 'private'" role="menuitem" :icon="Share" @click="run('share')">
      {{ t('share.open') }}
    </UiMenuItem>
    <UiMenuItem role="menuitem" :icon="Trash2" danger @click="run('delete')">{{ t('report.delete') }}</UiMenuItem>
  </UiPopoverMenu>
</template>

<style scoped>
.chat-row-menu {
  display: block;
}

/* The long press belongs to the row's menu, not to the browser's link preview. */
.chat-row {
  -webkit-touch-callout: none;
}

.chat-row--ready :deep(.list-row__subtitle) {
  color: var(--text);
  font-weight: 600;
}

.chat-row__percent {
  color: var(--text-muted);
  font: var(--text-label);
}
</style>
