<script setup lang="ts">
/**
 * «Ещё не разобраны»: the busiest chats of the month without a report, as rows — avatar, name, how much
 * you wrote this month, «Разобрать». Chats Telegram says are too small for a report are not offered. While
 * the list is on its way the section says so; if it failed it says that, with «Повторить».
 */
const { t, tc, formatNumber } = useI18n()
const workspace = useWorkspaceStore()
const actions = useReportActions()
const errorMessage = useErrorMessage()

const MAX = 5
const chats = computed(() => workspace.suggestions.slice(0, MAX))
const loading = computed(() => !workspace.recent && workspace.recentState !== 'error')
const failed = computed(() => !workspace.recent && workspace.recentState === 'error')
</script>

<template>
  <UiPageSection v-if="chats.length || loading || failed" :title="t('home.unanalysed')">
    <p v-if="loading" class="unanalysed__status t-label" role="status">
      <span class="spinner" aria-hidden="true" />{{ t('home.loadingChats') }}
    </p>
    <p v-else-if="failed" class="unanalysed__status t-label" role="status">
      {{ t('home.loadingChatsError') }}. {{ errorMessage(workspace.recentError) }}
      <button type="button" class="link" @click="workspace.loadRecent()">{{ t('common.retry') }}</button>
    </p>
    <UiGroup v-if="loading" aria-hidden="true">
      <div v-for="row in 3" :key="row" class="unanalysed__skeleton">
        <UiSkeleton width="var(--avatar-md)" height="var(--avatar-md)" radius="var(--radius-full)" />
        <span class="unanalysed__skeleton-copy">
          <UiSkeleton :width="`${64 - (row % 3) * 12}%`" height="var(--space-3)" />
          <UiSkeleton width="36%" height="var(--space-2)" />
        </span>
      </div>
    </UiGroup>
    <UiGroup v-else-if="chats.length">
      <UiListRow
        v-for="chat in chats"
        :key="chat.id"
        class="home-row"
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

<style scoped>
.unanalysed__status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
}

.unanalysed__skeleton {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--row-height);
}

.unanalysed__skeleton-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
