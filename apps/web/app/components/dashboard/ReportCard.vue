<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { MoreHorizontal, RotateCw, Share, Trash2 } from '../../lib/icons'

/**
 * A report on home: the card of every home screen — the avatar, the name, how many messages, the pulse in the
 * person's colour. New messages in the chat since the report are a quiet badge («+640»); «Обновить» is in the
 * card's menu. The whole card opens the report.
 */
const props = defineProps<{ report: ReportSummaryDto; hasAvatar?: boolean; added?: number }>()
const { t, tc, formatNumber } = useI18n()
const actions = useReportActions()
const menuOpen = ref(false)
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
  <HomeCard
    class="report-card"
    :chat-id="report.chatId"
    :title="report.title"
    :has-avatar="hasAvatar"
    poster
    :to="`/chat/${report.chatId}`"
  >
    <template #end>
      <span
        v-if="added && !updating"
        class="report-card__badge t-caption"
        :title="tc('dashboard.newMessages', added, { count: formatNumber(added) })"
        :aria-label="tc('dashboard.newMessages', added, { count: formatNumber(added) })"
        role="img"
      >
        +{{ formatNumber(added) }}
      </span>
      <UiPopoverMenu
        v-model:open="menuOpen"
        align="end"
        :aria-label="t('dashboard.reportMenu', { chat: report.title })"
        :title="report.title"
      >
        <template #trigger>
          <UiIconButton
            :label="t('dashboard.reportMenu', { chat: report.title })"
            :icon="MoreHorizontal"
            size="sm"
            class="report-card__menu"
            plain
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
    </template>
    <template #meta>
      <template v-if="updating"><span class="spinner" aria-hidden="true" /> {{ t('dashboard.analysingNow') }}</template>
      <template v-else>{{ meta }}</template>
    </template>
    <Pulse v-if="pulse" :data="pulse" :height="0" :bars="28" grow />
  </HomeCard>
</template>

<style scoped>
/* The quiet «⋯» sits on the card's edge optically: its glyph, not its circle, lines up with the padding. */
.report-card__menu {
  margin-right: calc(-1 * var(--space-2));
}

/* New messages: a quiet chip of poster ink beside the menu. */
.report-card__badge {
  padding: var(--space-0-5) var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--on-poster-chip);
  color: var(--on-poster);
  white-space: nowrap;
}
</style>
