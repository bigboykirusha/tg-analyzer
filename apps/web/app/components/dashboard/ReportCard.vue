<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { MoreHorizontal, RotateCw, Share, Trash2 } from '../../lib/icons'
import { hueOf } from '../../lib/hue'

/**
 * A report on home: a small poster in the person's colour — their avatar, the «⋯» menu, the name on one
 * line, how many messages, the pulse. The whole card opens the report; the menu refreshes, shares, deletes.
 */
const props = defineProps<{ report: ReportSummaryDto; hasAvatar?: boolean }>()
const { t, tc, formatNumber } = useI18n()
const actions = useReportActions()
const menuOpen = ref(false)
const hue = computed(() => hueOf(props.report.chatId))
const updating = computed(() => actions.busy(props.report.chatId))
const meta = computed(() => {
  const count = tc('common.messagesCount', props.report.totalMessages, {
    count: formatNumber(props.report.totalMessages),
  })
  return props.report.type === 'group' ? t('sidebar.groupMeta', { count }) : count
})
const pulse = computed(() =>
  props.report.pulse?.some((week) => week.sent || week.received) ? props.report.pulse : null,
)

function run(action: 'refresh' | 'share' | 'delete') {
  menuOpen.value = false
  if (action === 'refresh') void actions.analyse(props.report.chatId, props.report.title)
  else if (action === 'share') void navigateTo({ path: `/chat/${props.report.chatId}`, query: { share: null } })
  else actions.askDelete(props.report.chatId)
}
</script>

<template>
  <article class="mini" :data-hue="hue">
    <div class="mini__top">
      <ChatAvatar :chat-id="report.chatId" :title="report.title" :has-avatar="hasAvatar" size="sm" on-poster />
      <UiPopoverMenu
        v-model:open="menuOpen"
        class="mini__menu"
        align="end"
        :aria-label="t('dashboard.reportMenu', { chat: report.title })"
        :title="report.title"
      >
        <template #trigger>
          <UiIconButton
            :label="t('dashboard.reportMenu', { chat: report.title })"
            :icon="MoreHorizontal"
            tone="poster"
            size="sm"
            no-tooltip
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          />
        </template>
        <UiMenuItem role="menuitem" :icon="RotateCw" :disabled="updating" @click="run('refresh')">
          {{ t('dashboard.refreshReport') }}
        </UiMenuItem>
        <UiMenuItem v-if="report.type !== 'group'" role="menuitem" :icon="Share" @click="run('share')">
          {{ t('share.open') }}
        </UiMenuItem>
        <UiMenuItem role="menuitem" :icon="Trash2" danger @click="run('delete')">{{ t('report.delete') }}</UiMenuItem>
      </UiPopoverMenu>
    </div>
    <NuxtLink :to="`/chat/${report.chatId}`" class="mini__name">{{ report.title }}</NuxtLink>
    <span class="mini__meta">
      <template v-if="updating"><span class="spinner" aria-hidden="true" />{{ t('dashboard.analysingNow') }}</template>
      <template v-else>{{ meta }}</template>
    </span>
    <Pulse v-if="pulse" class="mini__pulse" :data="pulse" :height="12" :bars="28" />
  </article>
</template>

<style scoped>
.mini {
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
  min-height: 148px;
  padding: var(--card-padding);
  border-radius: var(--radius-lg);
  background: var(--poster);
  color: var(--on-poster);
  transition: transform var(--duration-press) var(--ease-standard);
}

.mini:active:not(:has(.mini__menu:active)) {
  transform: scale(var(--press-scale-lg));
}

.mini__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

/* The name is the card's link; it stretches over the whole card, the menu sits above it. */
.mini__name {
  overflow: hidden;
  font: var(--text-title);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini__name::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.mini__name:focus-visible {
  outline: none;
}

.mini__name:focus-visible::after {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
}

.mini__menu {
  position: relative;
  z-index: 1;
}

.mini__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
  color: var(--on-poster-muted);
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini__pulse {
  margin-top: auto;
  padding-top: var(--space-3);
}

@media (min-width: 901px) {
  .mini {
    min-height: 188px;
  }
}
</style>
