<script setup lang="ts">
/**
 * The first visit: «С кого начнём?» and straight under it every Telegram chat — the search, «Все / Личные / Группы»
 * and the list in Telegram's order, each row with «Разобрать». The list is what a newcomer came for; it is always
 * there, whereas the month's busiest chats are counted slowly and may not come at all (13.11: a page with only an
 * «Все чаты» row was empty).
 */
const { t } = useI18n()
const workspace = useWorkspaceStore()
const actions = useReportActions()

/** The month's busiest private chat (the same source as «Разобрать ещё»; chats too small are not in it). */
const pick = computed(() => workspace.suggestions[0] ?? null)
const busy = computed(() => (pick.value ? actions.busy(pick.value.id) : false))
</script>

<template>
  <div class="first">
    <header class="first__head">
      <h1 class="t-h1">{{ t('home.firstTitle') }}</h1>
      <p class="t-lede">{{ t('home.firstLede') }}</p>
    </header>
    <UiGroup v-if="pick" class="first__pick" :header="t('home.firstPickTitle')">
      <UiListRow wrap :title="pick.title" :subtitle="t('home.firstPickWhy')">
        <template #leading>
          <ChatAvatar size="lg" :chat-id="pick.id" :title="pick.title" :has-avatar="pick.hasAvatar" />
        </template>
        <template #trailing>
          <UiButton variant="primary" size="sm" :loading="busy" @click="actions.analyse(pick.id, pick.title)">
            {{ t('month.analyse') }}
          </UiButton>
        </template>
      </UiListRow>
    </UiGroup>
    <ChatPicker />
  </div>
</template>

<style scoped>
.first {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.first__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
</style>
