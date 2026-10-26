<script setup lang="ts">
/**
 * Phones: the analysed chats as a row of chips under the header, the phone
 * counterpart of the sidebar. The current chat is filled with ink.
 */
const workspace = useWorkspaceStore()
const route = useRoute()
const { t } = useI18n()
const activeId = computed(() => String(route.params.id ?? ''))
/** The open chat leads the row, so it is always on screen. */
const ordered = computed(() => {
  const active = workspace.reports.find((report) => report.chatId === activeId.value)
  return active ? [active, ...workspace.reports.filter((report) => report !== active)] : workspace.reports
})
</script>

<template>
  <nav v-if="workspace.reports.length > 1" class="chips no-print" :aria-label="t('sidebar.reports')">
    <NuxtLink
      v-for="report in ordered"
      :key="report.chatId"
      :to="`/chat/${report.chatId}`"
      class="chip"
      :aria-current="activeId === report.chatId ? 'page' : undefined"
    >
      <ChatAvatar :chat-id="report.chatId" :title="report.title" size="xs" />
      <span>{{ report.title }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.chips {
  display: flex;
  gap: var(--space-2);
  margin-inline: calc(var(--page-gutter) * -1);
  padding: var(--space-1) var(--page-gutter) var(--space-1);
  overflow-x: auto;
  scrollbar-width: none;
}

.chips::-webkit-scrollbar {
  display: none;
}

.chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
  max-width: 200px;
  min-height: 36px;
  padding: 4px 14px 4px 4px;
  border-radius: var(--radius-full);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--border);
  font: var(--text-ui);
  transition:
    background-color var(--transition-fast),
    transform var(--duration-press) var(--ease-standard);
}

.chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip:active {
  transform: scale(var(--press-scale));
}

.chip[aria-current='page'] {
  background: var(--text);
  color: var(--bg);
  box-shadow: none;
}
</style>
