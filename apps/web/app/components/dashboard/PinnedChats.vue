<script setup lang="ts">
import { Pin } from '../../lib/icons'
import type { WorkspaceChat } from '../../stores/workspace'

/**
 * «С кого начать»: the chats the user pinned in Telegram — the people they chose themselves —
 * as tiles above the full list. A tile opens its report, starts an analysis or shows that it runs.
 */
const props = defineProps<{
  chats: WorkspaceChat[]
  analysingId: string | null
  queued: Set<string>
  startingId: string | null
  disabled: boolean
}>()
const emit = defineEmits<{ analyse: [chat: WorkspaceChat] }>()
const { t } = useI18n()

/** Telegram pins five chats (more with Premium); a row of five reads at a glance. */
const MAX_PINNED = 5
const items = computed(() => props.chats.slice(0, MAX_PINNED))
</script>

<template>
  <section v-if="items.length" class="tile pinned" :aria-label="t('newAnalysis.pinned.title')">
    <header class="pinned__head">
      <h2 class="pinned__title">{{ t('newAnalysis.pinned.title') }}</h2>
      <span class="pinned__hint"><Pin aria-hidden="true" />{{ t('newAnalysis.pinned.hint') }}</span>
    </header>
    <ul class="pinned__list">
      <li
        v-for="chat in items"
        :key="chat.id"
        class="pinned__chat"
        :class="{ 'pinned__chat--busy': analysingId === chat.id }"
      >
        <ChatAvatar :chat-id="chat.id" :title="chat.title" :has-avatar="chat.hasAvatar" size="lg" />
        <span class="pinned__name">{{ chat.title }}</span>
        <span v-if="analysingId === chat.id" class="pinned__state">{{ t('newAnalysis.pinned.reading') }}</span>
        <span v-else-if="queued.has(chat.id)" class="pinned__state">{{ t('dashboard.queued') }}</span>
        <UiButton v-else-if="chat.report" :to="`/chat/${chat.id}`" variant="secondary" size="sm">
          {{ t('dashboard.openShort') }}
        </UiButton>
        <UiButton
          v-else
          variant="secondary"
          size="sm"
          :loading="startingId === chat.id"
          :disabled="disabled"
          @click="emit('analyse', chat)"
        >
          {{ t('dashboard.analyse') }}
        </UiButton>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.pinned__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
}

.pinned__title {
  font: var(--text-title);
}

.pinned__hint {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--text-muted);
  font: var(--text-small);
}

.pinned__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.pinned__chat {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-4) var(--space-2);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  text-align: center;
}

/* The chat being read: a partner-colour ring, the only accent of the block. */
.pinned__chat--busy {
  box-shadow: inset 0 0 0 2px var(--them);
}

.pinned__name {
  max-width: 100%;
  overflow: hidden;
  font: var(--text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pinned__state {
  display: inline-flex;
  align-items: center;
  min-height: var(--control-sm);
  color: var(--text-muted);
  font: var(--text-small);
}

@media (max-width: 640px) {
  .pinned__list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
  }
}
</style>
