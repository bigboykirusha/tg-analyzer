<script setup lang="ts">
import { AlertCircle, Search } from '../../lib/icons'

/**
 * The first visit: «С кого начнём?». The busiest chats of the month are the same cards as the reports
 * will be — avatar, name, a line, one button; only the first has the main one. Then a few more as rows and
 * the whole chat list. While Telegram hands over the list the cards are skeletons with a caption, and a
 * failed list says so with «Повторить».
 */
const { t, tc, formatNumber } = useI18n()
const workspace = useWorkspaceStore()
const errorMessage = useErrorMessage()
const isPhone = useMediaQuery('(max-width: 900px)')
const allChats = computed(() => (isPhone.value ? { query: { pick: null } } : '/new'))

const chats = computed(() => workspace.suggestions)
const cards = computed(() => chats.value.slice(0, isPhone.value ? 2 : 3))
const rows = computed(() => chats.value.slice(cards.value.length, cards.value.length + 4))
const loading = computed(() => !workspace.recent && workspace.recentState !== 'error')
const failed = computed(() => !workspace.recent && workspace.recentState === 'error')
const reload = () => workspace.loadRecent()
</script>

<template>
  <div class="first">
    <header class="first__head">
      <h1 class="t-h1">{{ t('home.firstTitle') }}</h1>
      <p class="t-lede">{{ t('home.firstLede') }}</p>
    </header>

    <!-- The busiest chats on their way: the same cards, so nothing jumps, and a line saying what is going on. -->
    <template v-if="loading">
      <p class="first__status t-label" role="status">
        <span class="spinner" aria-hidden="true" />{{ t('home.loadingChats') }}
      </p>
      <div class="first__cards" aria-hidden="true">
        <HomeCard v-for="card in isPhone ? 2 : 3" :key="card" skeleton />
      </div>
    </template>

    <UiEmptyState
      v-else-if="failed"
      compact
      tone="danger"
      :icon="AlertCircle"
      :title="t('home.loadingChatsError')"
      :description="errorMessage(workspace.recentError)"
    >
      <template #action>
        <UiButton @click="reload">{{ t('common.retry') }}</UiButton>
      </template>
    </UiEmptyState>

    <template v-else>
      <div v-if="cards.length" class="first__cards">
        <HomeCard
          v-for="(chat, index) in cards"
          :key="chat.id"
          :chat-id="chat.id"
          :title="chat.title"
          :has-avatar="chat.hasAvatar"
          :meta="
            index === 0
              ? t('home.firstMost', {
                  count: tc('home.monthMessages', chat.messages, { count: formatNumber(chat.messages) }),
                })
              : tc('home.unanalysedCount', chat.messages, { count: formatNumber(chat.messages) })
          "
        >
          <AnalyseButton
            :chat-id="chat.id"
            :title="chat.title"
            :variant="index === 0 ? 'primary' : 'secondary'"
            size="md"
            block
          />
        </HomeCard>
      </div>

      <UiGroup :header="rows.length ? t('home.firstOthers') : undefined">
        <UiListRow
          v-for="chat in rows"
          :key="chat.id"
          class="home-row"
          :title="chat.title"
          :subtitle="tc('home.unanalysedCount', chat.messages, { count: formatNumber(chat.messages) })"
        >
          <template #leading>
            <ChatAvatar :chat-id="chat.id" :title="chat.title" :has-avatar="chat.hasAvatar" />
          </template>
          <template #trailing>
            <AnalyseButton :chat-id="chat.id" :title="chat.title" />
          </template>
        </UiListRow>
        <UiListRow :to="allChats" :title="t('home.allChats')" chevron>
          <template #leading><Search aria-hidden="true" /></template>
        </UiListRow>
      </UiGroup>
      <p class="first__privacy t-label t-muted">{{ t('home.firstPrivacy') }}</p>
    </template>
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

.first__status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
}

/* Two beside each other on a phone, three on a wide screen: the cards of the reports that follow. */
.first__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--card-gap);
}

@media (min-width: 901px) {
  .first__cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
