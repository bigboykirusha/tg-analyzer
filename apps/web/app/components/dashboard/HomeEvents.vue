<script setup lang="ts">
import type { HomeEvent } from '@tg-analyzer/shared'
import { CircleHelp, RotateCw, Sparkles, User } from '../../lib/icons'

/**
 * «Главное» on the home screen: a few tiles, each one sentence about what is new — the month, new
 * messages since a report, a quiz answer, the next round-number message, the busiest chat without
 * a report. The month is the ink tile, the quiz answer the lime one; the rest are white.
 */
const props = defineProps<{ events: HomeEvent[] }>()
const { t, tc, formatNumber, formatPercent, formatDate } = useI18n()
const analysis = useAnalysis()
const auth = useAuthStore()
const toast = useToast()
const errorMessage = useErrorMessage()

const starting = ref<string | null>(null)
async function analyse(chatId: string, title: string) {
  starting.value = chatId
  try {
    await analysis.startAnalysis(chatId, title)
  } catch (error) {
    toast.error(t('analysis.startError'), errorMessage(error))
  } finally {
    starting.value = null
  }
}
const busy = (chatId: string) =>
  (analysis.isActive.value && analysis.progress.value.chatId === chatId) ||
  analysis.queued.value.some((item) => item.chatId === chatId)

const maxTop = computed(() => {
  const month = props.events.find((event) => event.kind === 'month')
  return month?.kind === 'month' ? Math.max(...month.top.map((chat) => chat.messages), 1) : 1
})
const ordinal = (index: number) => t('report.milestones.nth', { n: formatNumber(index) })
</script>

<template>
  <div class="home-events">
    <template v-for="event in events" :key="event.kind">
      <article v-if="event.kind === 'month'" class="tile tile--ink home-event">
        <p class="home-event__label"><Sparkles aria-hidden="true" />{{ t('home.monthLabel') }}</p>
        <p class="home-event__title">
          {{ tc('home.monthMessages', event.messages) }} {{ tc('home.monthChats', event.chats) }}
        </p>
        <ol class="home-event__top">
          <li v-for="chat in event.top.slice(0, 3)" :key="chat.chatId">
            <span class="home-event__name">{{ chat.title }}</span>
            <span class="home-event__bar"><i :style="{ width: `${(chat.messages / maxTop) * 100}%` }" /></span>
            <span class="t-num">{{ formatNumber(chat.messages) }}</span>
          </li>
        </ol>
        <p v-if="event.minePct !== null" class="home-event__note">
          {{ t('home.minePct', { value: formatPercent(event.minePct) }) }}
        </p>
      </article>

      <article v-else-if="event.kind === 'new'" class="tile home-event">
        <p class="home-event__label"><RotateCw aria-hidden="true" />{{ event.title }}</p>
        <p class="home-event__title">{{ tc('home.newMessages', event.added) }}</p>
        <p class="home-event__note">
          {{ t('home.newSince', { date: formatDate(event.analyzedAt, { day: 'numeric', month: 'long' }) }) }}
        </p>
        <div v-if="auth.telegramSessionActive && !busy(event.chatId)" class="home-event__foot">
          <UiButton
            variant="secondary"
            size="sm"
            :loading="starting === event.chatId"
            @click="analyse(event.chatId, event.title)"
          >
            {{ t('dashboard.reanalyse') }}
          </UiButton>
        </div>
      </article>

      <NuxtLink
        v-else-if="event.kind === 'quiz'"
        :to="`/chat/${event.chatId}`"
        class="tile tile--lime home-event home-event--link"
      >
        <p class="home-event__label">
          <CircleHelp aria-hidden="true" />{{ t('home.quizLabel', { name: event.title }) }}
        </p>
        <p class="home-event__title">{{ t('home.quizTitle', { score: event.score, total: event.total }) }}</p>
        <span class="home-event__dots" aria-hidden="true">
          <i v-for="place in event.total" :key="place" :class="{ 'is-on': place <= event.score }" />
        </span>
      </NuxtLink>

      <NuxtLink
        v-else-if="event.kind === 'milestone'"
        :to="`/chat/${event.chatId}`"
        class="tile home-event home-event--link"
      >
        <p class="home-event__label">
          <Sparkles aria-hidden="true" />{{ t('home.milestoneLabel', { name: event.title }) }}
        </p>
        <p class="home-event__title">{{ tc('home.milestoneTitle', event.days, { n: ordinal(event.index) }) }}</p>
      </NuxtLink>

      <article v-else-if="event.kind === 'unanalysed'" class="tile home-event">
        <p class="home-event__label"><User aria-hidden="true" />{{ event.title }}</p>
        <p class="home-event__title">{{ tc('home.unanalysedTitle', event.messages) }}</p>
        <div v-if="auth.telegramSessionActive" class="home-event__foot">
          <span v-if="busy(event.chatId)" class="home-event__note">{{ t('month.queued') }}</span>
          <UiButton
            v-else
            class="home-event__analyse"
            variant="secondary"
            size="sm"
            :loading="starting === event.chatId"
            @click="analyse(event.chatId, event.title)"
          >
            {{ t('month.analyse') }}
          </UiButton>
        </div>
      </article>
    </template>
  </div>
</template>

<style scoped>
.home-events {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--card-gap, var(--space-4));
}

.home-event {
  gap: var(--space-3);
}

.home-event--link {
  color: inherit;
}

.home-event__label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

.home-event__title {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  text-wrap: balance;
}

.home-event__note {
  color: var(--text-muted);
  font: var(--text-small);
}

.home-event__foot {
  display: flex;
  margin-top: auto;
}

/* The month: the three busiest chats as thin bars, the whole chat in the neutral chart colour. */
.home-event__top {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  font: var(--text-small);
  list-style: none;
}

.home-event__top li {
  display: grid;
  grid-template-columns: minmax(0, 8rem) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
}

.home-event__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-event__bar {
  height: var(--bar-height);
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.home-event__bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--chart-neutral-strong);
}

.tile--ink .home-event__bar i {
  background: var(--on-tile-ink);
}

.home-event__dots {
  display: flex;
  gap: var(--space-2);
  margin-top: auto;
}

.home-event__dots i {
  width: var(--icon-md);
  height: var(--icon-md);
  border-radius: var(--radius-full);
  background: var(--on-lime-well);
}

.home-event__dots i.is-on {
  background: var(--on-lime);
}

@media (hover: hover) and (pointer: fine) {
  .home-event--link:hover {
    background-image: linear-gradient(var(--hover), var(--hover));
  }
}

@media (max-width: 640px) {
  .home-events {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
