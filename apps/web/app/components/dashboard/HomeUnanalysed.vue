<script setup lang="ts">
/**
 * «Ещё не разобраны»: the busiest chats of the month without a report, as rows — avatar, name, how much
 * you wrote this month, «Разобрать». The row shows the progress; then the report card takes its place.
 */
const { t, tc, formatNumber } = useI18n()
const workspace = useWorkspaceStore()
const actions = useReportActions()

const MAX = 5
const chats = computed(() => {
  const withReport = new Set(workspace.reports.map((report) => report.chatId))
  return (workspace.recent?.chats ?? []).filter((chat) => !withReport.has(chat.id)).slice(0, MAX)
})
</script>

<template>
  <UiPageSection v-if="chats.length" :title="t('home.unanalysed')">
    <UiGroup>
      <UiListRow
        v-for="chat in chats"
        :key="chat.id"
        class="chat-row"
        :title="chat.title"
        :subtitle="tc('home.unanalysedCount', chat.messages, { count: formatNumber(chat.messages) })"
      >
        <template #leading>
          <ChatAvatar :chat-id="chat.id" :title="chat.title" :has-avatar="chat.hasAvatar" />
        </template>
        <template #trailing>
          <UiButton
            size="sm"
            :loading="actions.busy(chat.id)"
            :aria-label="t('home.unanalysedAction', { name: chat.title })"
            @click="actions.analyse(chat.id, chat.title)"
          >
            {{ t('month.analyse') }}
          </UiButton>
        </template>
      </UiListRow>
    </UiGroup>
  </UiPageSection>
</template>
