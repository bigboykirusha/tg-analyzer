<script setup lang="ts">
/**
 * «Закреплённые» on the home screen: the chats pinned in Telegram as big avatars with a first name.
 * A chat with a report opens it; one without opens «Новый анализ», where it can be analysed.
 */
const workspace = useWorkspaceStore()
const { t } = useI18n()

/** Telegram pins five chats (more with Premium); a row of six still fits a phone. */
const MAX_PINNED = 6
const pinned = computed(() => workspace.chats.filter((chat) => chat.pinned).slice(0, MAX_PINNED))
const firstName = (title: string) => title.split(/\s+/)[0] ?? title
</script>

<template>
  <UiPageSection v-if="pinned.length" :title="t('home.pinned')">
    <ul class="pinned-people">
      <li v-for="chat in pinned" :key="chat.id">
        <NuxtLink :to="chat.report ? `/chat/${chat.id}` : '/new'" class="pinned-people__item" :title="chat.title">
          <ChatAvatar :chat-id="chat.id" :title="chat.title" :has-avatar="chat.hasAvatar" size="lg" />
          <span class="pinned-people__name">{{ firstName(chat.title) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </UiPageSection>
</template>

<style scoped>
.pinned-people {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.pinned-people__item {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  width: 72px;
  color: var(--text);
  font: var(--text-small);
  text-align: center;
}

.pinned-people__name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (hover: hover) and (pointer: fine) {
  .pinned-people__item:hover .pinned-people__name {
    text-decoration: underline;
  }
}

@media (max-width: 640px) {
  .pinned-people {
    gap: var(--space-3);
  }

  .pinned-people__item {
    width: 60px;
  }
}
</style>
