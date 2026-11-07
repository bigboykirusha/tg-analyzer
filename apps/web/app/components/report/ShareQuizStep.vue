<script setup lang="ts">
import type { QuizQuestionDto, ShareLinkDto } from '@tg-analyzer/shared'
import { Check, Copy, Lock, Send, X } from '../../lib/icons'

/**
 * «Угадайка», the second step of «Поделиться» (variant Б, no settings): the questions are ready by
 * themselves; send them in Telegram or copy the link. While waiting — the same two buttons; after
 * the answer — the score and right or wrong per question, if the other side agreed to show them.
 */
const props = defineProps<{
  chatId: string
  name: string
  link: ShareLinkDto | null
  /** The report's own questions, used before a link exists. */
  questions: QuizQuestionDto[]
}>()
const emit = defineEmits<{ update: [link: ShareLinkDto | null] }>()
const { t, tc, formatDate } = useI18n()
const { question } = useQuizText()
const toast = useToast()
const errorMessage = useErrorMessage()

const days = ref<'7' | '30'>('7')
const busy = ref(false)
const dayOptions = computed(() => [
  { value: '7' as const, label: t('share.days.7') },
  { value: '30' as const, label: t('share.days.30') },
])
const list = computed(() => props.link?.questions ?? props.questions)
const result = computed(() => props.link?.result ?? null)
const until = computed(() =>
  props.link?.expiresAt
    ? t('share.until', { date: formatDate(props.link.expiresAt, { day: 'numeric', month: 'long' }) })
    : '',
)

async function create(): Promise<ShareLinkDto | null> {
  busy.value = true
  try {
    const link = await api('POST /api/v1/reports/:chatId/links', {
      params: { chatId: props.chatId },
      body: { kind: 'quiz', days: Number(days.value) as 7 | 30 },
    })
    emit('update', link)
    return link
  } catch (error) {
    toast.error(errorMessage(error))
    return null
  } finally {
    busy.value = false
  }
}

const urlOf = (link: ShareLinkDto) => `${location.origin}/s/${link.token}`

/** Telegram's own share screen: the guest gets the link with one line of text. */
async function send() {
  const link = props.link ?? (await create())
  if (!link) return
  const share = new URL('https://t.me/share/url')
  share.searchParams.set('url', urlOf(link))
  share.searchParams.set('text', t('share.quiz.message'))
  window.open(share.toString(), '_blank', 'noopener')
}

async function copy() {
  const link = props.link ?? (await create())
  if (!link) return
  await navigator.clipboard.writeText(urlOf(link))
  toast.success(t('share.link.copied'))
}

async function remove() {
  busy.value = true
  try {
    await api('DELETE /api/v1/reports/:chatId/links/:kind', { params: { chatId: props.chatId, kind: 'quiz' } })
    emit('update', null)
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="quiz-step">
    <template v-if="result">
      <div class="quiz-step__score">
        <span v-if="result.score !== null" class="quiz-step__figure t-num">
          {{ t('publicQuiz.score', { score: result.score, total: result.total }) }}
        </span>
        <span v-else class="t-h2">{{ t('share.quiz.hidden') }}</span>
        <span class="t-small t-muted">
          {{ t('share.quiz.answered', { date: formatDate(result.answeredAt, { day: 'numeric', month: 'long' }) }) }}
        </span>
      </div>
      <ol class="quiz-step__list">
        <li v-for="(item, index) in list" :key="item.id">
          <span
            v-if="result.correct"
            class="quiz-step__mark"
            :class="result.correct[index] ? 'is-right' : 'is-wrong'"
            :aria-label="result.correct[index] ? t('publicQuiz.right') : t('publicQuiz.wrong')"
          >
            <Check v-if="result.correct[index]" aria-hidden="true" />
            <X v-else aria-hidden="true" />
          </span>
          {{ question(item.id) }}
        </li>
      </ol>
      <UiButton variant="secondary" block :loading="busy" @click="create">{{ t('share.quiz.again') }}</UiButton>
    </template>
    <template v-else>
      <div class="quiz-step__ready">
        <span class="quiz-step__figure t-num">{{ list.length }}</span>
        <span class="t-small">{{ tc('share.quiz.ready', list.length) }}</span>
      </div>
      <ol class="quiz-step__list">
        <li v-for="item in list" :key="item.id">{{ question(item.id) }}</li>
      </ol>
      <p v-if="link" class="t-small t-muted">{{ [t('share.quiz.waiting'), until].filter(Boolean).join(', ') }}</p>
      <div v-else class="quiz-step__days">
        <span class="t-small">{{ t('share.link.days') }}</span>
        <UiSegmentedControl v-model="days" inline :options="dayOptions" :aria-label="t('share.link.days')" />
      </div>
      <UiButton variant="primary" block :icon="Send" :loading="busy" @click="send">{{ t('share.quiz.send') }}</UiButton>
      <UiButton variant="secondary" block :icon="Copy" :disabled="busy" @click="copy">
        {{ t('share.quiz.copy') }}
      </UiButton>
      <p class="quiz-step__note"><Lock aria-hidden="true" />{{ t('share.quiz.privacy') }}</p>
    </template>
    <UiButton v-if="link" variant="ghost" size="sm" class="quiz-step__delete" :disabled="busy" @click="remove">
      {{ t('share.quiz.delete') }}
    </UiButton>
  </div>
</template>

<style scoped>
.quiz-step {
  display: grid;
  gap: var(--space-4);
}

.quiz-step__ready,
.quiz-step__score {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2) var(--space-4);
}

.quiz-step__figure {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

/* The questions as one well of numbered rows, split by hairlines. */
.quiz-step__list {
  display: grid;
  margin: 0;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  background: var(--fill-raised);
  font: var(--text-small);
  list-style: none;
  counter-reset: question;
}

.quiz-step__list li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--control-md);
  padding-block: var(--space-2);
  counter-increment: question;
}

.quiz-step__list li + li {
  box-shadow: var(--divider-top);
}

.quiz-step__list li::before {
  min-width: var(--space-4);
  color: var(--text-muted);
  font: var(--text-caption);
  content: counter(question);
}

/* After the answer, the mark stands for the number. */
.quiz-step__list li:has(.quiz-step__mark)::before {
  content: none;
}

.quiz-step__mark {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--icon-lg);
  height: var(--icon-lg);
  border-radius: var(--radius-full);
  background: var(--surface-2);
  color: var(--text-muted);
}

.quiz-step__mark.is-right {
  background: var(--them);
  color: var(--surface);
}

.quiz-step__days {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.quiz-step__note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-caption);
}

.quiz-step__delete {
  justify-self: start;
  color: var(--danger);
}
</style>
