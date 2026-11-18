<script setup lang="ts">
import type { WorkspaceChat } from '../../stores/workspace'
import { RotateCw, Share, Trash2 } from '../../lib/icons'

/**
 * The row starts an analysis or opens an existing report. While the chat is being read or queued,
 * its progress control is separate from the report link. Long press or right click opens the report menu.
 */
const props = defineProps<{ chat: WorkspaceChat }>()
const { t, formatRelative } = useI18n()
const actions = useReportActions()
const analysis = useAnalysis()
const menuOpen = ref(false)
const now = useNow(30_000)

const root = useTemplateRef<HTMLElement>('root')
const progress = useTemplateRef<HTMLElement>('progress')
const progressState = computed(() => {
  if (analysis.queued.value.some((item) => item.chatId === props.chat.id)) return 'queued'
  if (analysis.isActive.value && analysis.progress.value.chatId === props.chat.id) return 'reading'
  return null
})
const starting = computed(() => actions.starting.value === props.chat.id)
const READY_MS = 3 * 60_000
const justReady = computed(() => !!props.chat.report && now.value - Date.parse(props.chat.report.analyzedAt) < READY_MS)
const tooSmall = computed(() => !!props.chat.tooSmall && !props.chat.report)
const canStart = computed(() => !props.chat.report && !tooSmall.value && !progressState.value)
const meta = computed(() => {
  const group = props.chat.type !== 'private'
  if (justReady.value) return t('dashboard.reportReady')
  if (tooSmall.value) return t('newAnalysis.tooSmall')
  if (props.chat.report) {
    const line = t('dashboard.analysed', { time: formatRelative(props.chat.report.analyzedAt, 'short') })
    return group ? t('sidebar.groupMeta', { count: line.toLocaleLowerCase() }) : line
  }
  const time = props.chat.lastMessageAt ? formatRelative(props.chat.lastMessageAt, 'short') : null
  // A group's line already starts with «Группа»: the time alone keeps it whole beside the button («Группа, 6 ч назад»).
  if (group) return time ? t('sidebar.groupMeta', { count: time }) : t('chatType.group')
  return time ? t('newAnalysis.wrote', { time }) : ''
})

watch(progressState, async (state) => {
  const focused = document.activeElement
  const hadFocus = focused === root.value?.querySelector('button.chat-row__entry') || progress.value?.contains(focused)
  if (!hadFocus) return
  await nextTick()
  if (document.activeElement !== document.body) return
  if (state) progress.value?.querySelector('button')?.focus()
  else root.value?.querySelector<HTMLElement>('button.chat-row__entry, a.chat-row__entry')?.focus()
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
function activate(event: MouseEvent) {
  if (swallow) {
    swallow = false
    event.preventDefault()
    return
  }
  if (canStart.value) void actions.analyse(props.chat.id, props.chat.title)
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
  <UiPopoverMenu v-model:open="menuOpen" class="chat-row" align="end" :aria-label="chat.title" :title="chat.title">
    <template #trigger>
      <div ref="root" class="chat-row__line" :class="{ 'chat-row__line--working': progressState }">
        <UiListRow
          class="chat-row__entry"
          :class="{ 'chat-row--ready': justReady && !progressState }"
          :as="canStart ? 'button' : 'div'"
          :to="chat.report ? `/chat/${chat.id}` : undefined"
          :title="chat.title"
          :subtitle="meta"
          :aria-label="canStart ? t('home.unanalysedAction', { name: chat.title }) : undefined"
          :aria-disabled="starting && canStart ? true : undefined"
          :aria-busy="starting && canStart ? true : undefined"
          :chevron="!!chat.report && !progressState"
          @contextmenu="openMenu"
          @pointerdown="pressDown"
          @pointermove="pressMove"
          @pointerup="pressCancel"
          @pointercancel="pressCancel"
          @click.capture="activate"
        >
          <template #leading>
            <ChatAvatar :chat-id="chat.id" :title="chat.title" :has-avatar="chat.hasAvatar" />
          </template>
          <template v-if="canStart" #trailing>
            <span class="chat-row__action t-label">
              <span class="chat-row__action-label">{{ t('month.analyse') }}</span>
              <span v-if="starting" class="spinner" aria-hidden="true" />
            </span>
          </template>
        </UiListRow>
        <div v-if="progressState" ref="progress" class="chat-row__progress">
          <AnalyseButton :chat-id="chat.id" :title="chat.title" />
        </div>
      </div>
    </template>
    <UiMenuItem role="menuitem" :icon="RotateCw" @click="run('refresh')">{{ t('dashboard.refreshReport') }}</UiMenuItem>
    <UiMenuItem v-if="chat.type === 'private'" role="menuitem" :icon="Share" @click="run('share')">
      {{ t('share.open') }}
    </UiMenuItem>
    <UiMenuItem role="menuitem" :icon="Trash2" danger @click="run('delete')">{{ t('report.delete') }}</UiMenuItem>
  </UiPopoverMenu>
</template>

<style scoped>
.chat-row__line {
  display: flex;
}

.chat-row__entry {
  flex: 1;
}

.chat-row__line--working :deep(.list-row__body) {
  margin-right: 0;
}

.chat-row__progress {
  display: flex;
  align-items: center;
  margin-right: var(--row-inset);
  padding-left: var(--space-2);
}

.chat-row:not(:last-child) .chat-row__progress {
  box-shadow: var(--divider-bottom);
}

.chat-row__entry[aria-busy='true'] {
  cursor: progress;
}

/* «Разобрать» wears the quiet sm capsule of `AnalyseButton` (18.11): the row is the button, so this is its
   picture, and the place keeps one shape from «Разобрать» through «17 %» and «В очереди». */
.chat-row__action {
  display: grid;
  place-items: center;
  height: var(--control-sm);
  padding: 0 var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--fill-control);
  color: var(--text);
}

.chat-row__action > span {
  grid-area: 1 / 1;
}

.chat-row__entry[aria-busy='true'] .chat-row__action-label {
  visibility: hidden;
}

/* The long press belongs to the row's menu, not to the browser's link preview. */
.chat-row__entry {
  -webkit-touch-callout: none;
}

/* Just analysed: the line in full ink — colour, not a heavier weight, as everywhere else. */
.chat-row--ready :deep(.list-row__subtitle) {
  color: var(--text);
}
</style>
