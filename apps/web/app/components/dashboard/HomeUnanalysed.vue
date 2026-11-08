<script setup lang="ts">
/**
 * «Ещё не разобраны»: the busiest chats of the month that have no report, as dashed avatars — a person
 * not yet drawn. A tap starts the analysis right here; the row shows the progress, then the report
 * card takes the chat's place above.
 */
const { t, tc, formatNumber } = useI18n()
const workspace = useWorkspaceStore()
const analysis = useAnalysis()
const toast = useToast()
const errorMessage = useErrorMessage()

const MAX = 8
const chats = computed(() => {
  const withReport = new Set(workspace.reports.map((report) => report.chatId))
  return (workspace.recent?.chats ?? []).filter((chat) => !withReport.has(chat.id)).slice(0, MAX)
})
const busy = (chatId: string) =>
  (analysis.isActive.value && analysis.progress.value.chatId === chatId) ||
  analysis.queued.value.some((item) => item.chatId === chatId)
const starting = ref<string | null>(null)

async function analyse(chatId: string, title: string) {
  if (busy(chatId) || starting.value) return
  starting.value = chatId
  try {
    await analysis.startAnalysis(chatId, title)
  } catch (error) {
    toast.error(t('analysis.startError'), errorMessage(error))
  } finally {
    starting.value = null
  }
}

const firstName = (title: string) => title.split(/\s+/u)[0] ?? title
</script>

<template>
  <UiPageSection v-if="chats.length" :title="t('home.unanalysed')">
    <ul class="unanalysed">
      <li v-for="chat in chats" :key="chat.id">
        <button
          type="button"
          class="unanalysed__item"
          :class="{ 'is-busy': busy(chat.id) || starting === chat.id }"
          :aria-label="t('home.unanalysedAction', { name: chat.title })"
          @click="analyse(chat.id, chat.title)"
        >
          <span class="unanalysed__ring">
            <ChatAvatar :chat-id="chat.id" :title="chat.title" :has-avatar="chat.hasAvatar" />
            <span v-if="busy(chat.id) || starting === chat.id" class="spinner unanalysed__spinner" aria-hidden="true" />
          </span>
          <span class="unanalysed__name">{{ firstName(chat.title) }}</span>
          <span class="unanalysed__count t-num">{{
            tc('home.unanalysedCount', chat.messages, { count: formatNumber(chat.messages) })
          }}</span>
        </button>
      </li>
    </ul>
  </UiPageSection>
</template>

<style scoped>
.unanalysed {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(calc(var(--avatar-lg) + var(--space-6)), 1fr));
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.unanalysed__item {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text);
  cursor: pointer;
  text-align: center;
}

/* A person not yet drawn: their avatar inside a dashed ring, faded until the report exists. */
.unanalysed__ring {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--avatar-lg);
  height: var(--avatar-lg);
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-full);
}

.unanalysed__ring :deep(.avatar) {
  opacity: 0.55;
}

.unanalysed__spinner {
  position: absolute;
}

.unanalysed__item:active .unanalysed__ring {
  transform: scale(var(--press-scale));
}

.unanalysed__name {
  max-width: 100%;
  overflow: hidden;
  font: var(--text-small);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unanalysed__count {
  color: var(--text-muted);
  font: var(--text-caption);
}

@media (hover: hover) and (pointer: fine) {
  .unanalysed__item:hover .unanalysed__ring {
    border-color: var(--text-muted);
  }
}
</style>
