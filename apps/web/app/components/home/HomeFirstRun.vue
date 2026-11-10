<script setup lang="ts">
import { Search } from '../../lib/icons'
import { hueOf } from '../../lib/hue'

/**
 * The first visit: «С кого начнём?». The person you wrote to most this month is a poster with the one
 * primary action; the next ones are rows; then the whole chat list. Desktop shows the top three as posters.
 */
const { t, tc, formatNumber } = useI18n()
const workspace = useWorkspaceStore()
const actions = useReportActions()
const isPhone = useMediaQuery('(max-width: 900px)')
const allChats = computed(() => (isPhone.value ? { query: { pick: null } } : '/new'))

const chats = computed(() => workspace.recent?.chats ?? [])
const posters = computed(() => chats.value.slice(0, isPhone.value ? 1 : 3))
const rows = computed(() => chats.value.slice(posters.value.length, posters.value.length + 4))
const loading = computed(() => !workspace.recent && workspace.recentState !== 'error')
</script>

<template>
  <div class="first">
    <header class="first__head">
      <h1 class="t-h1">{{ t('home.firstTitle') }}</h1>
      <p class="first__lede">{{ t('home.firstLede') }}</p>
    </header>

    <!-- The busiest chats on their way: the same poster and rows, so nothing jumps. -->
    <template v-if="loading">
      <div class="first__posters" aria-hidden="true">
        <div v-for="card in isPhone ? 1 : 3" :key="card" class="first__poster first__poster--skeleton">
          <UiSkeleton width="var(--avatar-lg)" height="var(--avatar-lg)" radius="var(--radius-full)" />
          <UiSkeleton width="50%" height="var(--space-6)" />
          <UiSkeleton width="70%" height="var(--space-3)" />
          <UiSkeleton class="first__action" height="var(--control-md)" radius="var(--radius-full)" />
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="posters.length" class="first__posters">
        <article v-for="(chat, index) in posters" :key="chat.id" class="first__poster" :data-hue="hueOf(chat.id)">
          <ChatAvatar :chat-id="chat.id" :title="chat.title" :has-avatar="chat.hasAvatar" size="lg" on-poster />
          <h2 class="first__name">{{ chat.title }}</h2>
          <p class="first__meta">
            {{
              index === 0
                ? t('home.firstMost', {
                    count: tc('home.monthMessages', chat.messages, { count: formatNumber(chat.messages) }),
                  })
                : tc('home.unanalysedCount', chat.messages, { count: formatNumber(chat.messages) })
            }}
          </p>
          <UiButton
            class="first__action"
            :variant="index === 0 ? 'poster' : 'poster-soft'"
            size="lg"
            block
            :loading="actions.busy(chat.id)"
            :aria-label="t('home.unanalysedAction', { name: chat.title })"
            @click="actions.analyse(chat.id, chat.title)"
          >
            {{ t('month.analyse') }}
          </UiButton>
        </article>
      </div>

      <UiGroup :header="rows.length ? t('home.firstOthers') : undefined">
        <UiListRow
          v-for="chat in rows"
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
        <UiListRow :to="allChats" :title="t('home.allChats')" chevron>
          <template #leading><Search aria-hidden="true" /></template>
        </UiListRow>
      </UiGroup>
      <p class="first__privacy">{{ t('home.firstPrivacy') }}</p>
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

.first__lede,
.first__privacy {
  color: var(--text-muted);
  font: var(--text-small);
}

.first__posters {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--card-gap);
}

@media (min-width: 901px) {
  .first__posters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .first__lede {
    font: var(--text-body);
  }
}

.first__poster {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  min-width: 0;
  padding: var(--space-6) var(--card-padding) var(--card-padding);
  border-radius: var(--radius-lg);
  background: var(--poster);
  color: var(--on-poster);
}

.first__poster--skeleton {
  gap: var(--space-3);
  background: var(--surface);
}

.first__name {
  max-width: 100%;
  margin-top: var(--space-3);
  overflow: hidden;
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.first__meta {
  color: var(--on-poster-muted);
  font: var(--text-small);
}

.first__action {
  margin-top: var(--space-4);
}
</style>
