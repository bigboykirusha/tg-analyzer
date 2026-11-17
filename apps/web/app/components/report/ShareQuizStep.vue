<script setup lang="ts">
import type { QuizQuestionDto, ShareLinkDto } from '@tg-analyzer/shared'
import { Check, Copy, Play, RotateCw, Send, X } from '../../lib/icons'

/**
 * «Угадайка», the second step of «Поделиться» (17.11: simple, two ways and nothing else). Send it — the other side
 * guesses by link, you see their score here. Or play it yourself — the same questions on their own page, answers
 * right away, nothing sent. No bets before the link, no score against score.
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
const copyLink = useCopyLink()
const errorMessage = useErrorMessage()

const busy = ref(false)
/** «Новая угадайка»: the old link stays until the new one is made, the step shows the empty one meanwhile. */
const fresh = ref(false)
const live = computed(() => (fresh.value ? null : props.link))
const list = computed(() => live.value?.questions ?? props.questions)
const result = computed(() => live.value?.result ?? null)
const lede = computed(() => {
  if (!live.value) return t('share.quiz.choose')
  const until = live.value.expiresAt
    ? t('share.until', { date: formatDate(live.value.expiresAt, { day: 'numeric', month: 'long' }) })
    : ''
  return [t('share.quiz.waiting'), until].filter(Boolean).join(', ')
})

async function create(): Promise<ShareLinkDto | null> {
  busy.value = true
  try {
    const link = await api('POST /api/v1/reports/:chatId/links', {
      params: { chatId: props.chatId },
      body: { kind: 'quiz', days: 30 },
    })
    fresh.value = false
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
  const link = live.value ?? (await create())
  if (!link) return
  const share = new URL('https://t.me/share/url')
  share.searchParams.set('url', urlOf(link))
  share.searchParams.set('text', t('share.quiz.message'))
  window.open(share.toString(), '_blank', 'noopener')
}

async function copy() {
  const link = live.value ?? (await create())
  if (!link) return
  await copyLink.copy(urlOf(link))
}
</script>

<template>
  <div class="quiz-step">
    <div class="quiz-step__head">
      <template v-if="result">
        <p v-if="result.score !== null" class="quiz-step__figure">
          {{ t('publicQuiz.score', { score: result.score, total: result.total }) }}
        </p>
        <p v-else class="quiz-step__title">{{ t('share.quiz.hidden') }}</p>
        <p class="quiz-step__text">
          {{
            t('share.quiz.answered', {
              name,
              date: formatDate(result.answeredAt, { day: 'numeric', month: 'long' }),
            })
          }}
        </p>
      </template>
      <template v-else>
        <p class="quiz-step__figure">{{ tc('share.quiz.count', list.length) }}</p>
        <p class="quiz-step__text">{{ lede }}</p>
      </template>
    </div>

    <ol v-if="result?.correct" class="quiz-step__list">
      <li v-for="(item, index) in list" :key="item.id">
        <span
          class="quiz-step__mark"
          :class="{ 'is-right': result.correct[index] }"
          role="img"
          :aria-label="result.correct[index] ? t('publicQuiz.right') : t('publicQuiz.wrong')"
        >
          <Check v-if="result.correct[index]" aria-hidden="true" />
          <X v-else aria-hidden="true" />
        </span>
        <span class="quiz-step__question">{{ question(item.id) }}</span>
      </li>
    </ol>

    <div class="quiz-step__actions">
      <UiGroup>
        <UiListRow v-if="result" as="button" :title="t('share.quiz.again')" :disabled="busy" @click="fresh = true">
          <template #leading><RotateCw aria-hidden="true" /></template>
        </UiListRow>
        <template v-else>
          <UiListRow
            as="button"
            :title="t('share.quiz.send')"
            :subtitle="t('share.quiz.sendHint', { name })"
            :disabled="busy"
            @click="send"
          >
            <template #leading><Send aria-hidden="true" /></template>
          </UiListRow>
          <UiListRow as="button" :title="t('share.quiz.copy')" :disabled="busy" @click="copy">
            <template #leading><Copy aria-hidden="true" /></template>
          </UiListRow>
        </template>
      </UiGroup>
      <UiGroup>
        <UiListRow :to="`/quiz/${chatId}`" :title="t('share.quiz.self')" :subtitle="t('share.quiz.selfHint')">
          <template #leading><Play aria-hidden="true" /></template>
        </UiListRow>
      </UiGroup>
      <ShareFallback
        v-if="copyLink.fallback.value"
        :url="copyLink.fallback.value"
        :can-share="copyLink.canShare.value"
        @share="copyLink.share"
      />
      <p class="quiz-step__note">{{ t('share.quiz.privacy') }}</p>
    </div>
  </div>
</template>

<style scoped>
.quiz-step {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.quiz-step__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.quiz-step__figure {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.quiz-step__title {
  font: var(--text-body);
}

.quiz-step__text,
.quiz-step__note {
  color: var(--text-muted);
  font: var(--text-label);
}

.quiz-step__note {
  padding-top: var(--space-1);
  text-align: center;
}

/* After the answer: the questions as rows with hairlines, right or wrong for each. */
.quiz-step__list li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--control-md);
  padding: var(--space-2) 0;
  box-shadow: var(--divider-bottom);
  font: var(--text-label);
}

.quiz-step__list li:last-child {
  box-shadow: none;
}

.quiz-step__question {
  flex: 1;
  min-width: 0;
}

.quiz-step__mark {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--avatar-xs);
  height: var(--avatar-xs);
  border-radius: var(--radius-pill);
  background: var(--fill-raised);
  color: var(--text-muted);
  --icon-size: var(--icon-sm);
}

.quiz-step__mark.is-right {
  background: var(--you);
  color: var(--on-you);
}

.quiz-step__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
