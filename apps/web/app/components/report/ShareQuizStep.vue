<script setup lang="ts">
import type { QuizQuestionDto, ShareLinkDto } from '@tg-analyzer/shared'
import { Check, Copy, RotateCw, Send, X } from '../../lib/icons'

/**
 * «Угадайка», the second step of «Поделиться»: the questions are ready by themselves — send them in
 * Telegram or copy the link (it lives 30 days). After the answer: the score and right or wrong per
 * question, if the other side agreed to show them, and a way to start a new one.
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
      body: { kind: 'quiz', days: 30 },
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
          {{ t('share.quiz.answered', { date: formatDate(result.answeredAt, { day: 'numeric', month: 'long' }) }) }}
        </p>
      </template>
      <template v-else>
        <p class="quiz-step__title">{{ t('share.quiz.lead', { name }) }}</p>
        <p class="quiz-step__text">
          {{ link ? [t('share.quiz.waiting'), until].filter(Boolean).join(', ') : tc('share.quiz.ready', list.length) }}
        </p>
      </template>
    </div>

    <ol class="quiz-step__list">
      <li v-for="(item, index) in list" :key="item.id">
        <span
          v-if="result?.correct"
          class="quiz-step__mark"
          :class="{ 'is-right': result.correct[index] }"
          role="img"
          :aria-label="result.correct[index] ? t('publicQuiz.right') : t('publicQuiz.wrong')"
        >
          <Check v-if="result.correct[index]" aria-hidden="true" />
          <X v-else aria-hidden="true" />
        </span>
        <span v-else class="quiz-step__number" aria-hidden="true">{{ index + 1 }}</span>
        {{ question(item.id) }}
      </li>
    </ol>

    <div class="quiz-step__actions">
      <UiGroup>
        <UiListRow v-if="result" as="button" :title="t('share.quiz.again')" :disabled="busy" @click="create">
          <template #leading><RotateCw aria-hidden="true" /></template>
        </UiListRow>
        <template v-else>
          <UiListRow as="button" :title="t('share.quiz.send')" :disabled="busy" @click="send">
            <template #leading><Send aria-hidden="true" /></template>
          </UiListRow>
          <UiListRow as="button" :title="t('share.quiz.copy')" :disabled="busy" @click="copy">
            <template #leading><Copy aria-hidden="true" /></template>
          </UiListRow>
        </template>
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
  font: var(--text-title);
}

.quiz-step__text,
.quiz-step__note {
  color: var(--text-muted);
  font: var(--text-small);
}

.quiz-step__note {
  text-align: center;
}

/* The questions as rows with hairlines: its number, or right and wrong after the answer. */
.quiz-step__list li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--control-md);
  padding: var(--space-2) 0;
  box-shadow: var(--divider-bottom);
  font: var(--text-small);
}

.quiz-step__list li:last-child {
  box-shadow: none;
}

.quiz-step__number,
.quiz-step__mark {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--avatar-xs);
  height: var(--avatar-xs);
  border-radius: var(--radius-full);
  background: var(--fill-raised);
  color: var(--text-muted);
  font: var(--text-caption);
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

.quiz-step__note {
  padding-top: var(--space-1);
}
</style>
