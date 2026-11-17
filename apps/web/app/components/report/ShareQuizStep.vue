<script setup lang="ts">
import type { QuizQuestionDto, ShareLinkDto } from '@tg-analyzer/shared'
import { Check, Copy, Play, RotateCw, Send, X } from '../../lib/icons'
import { wave } from '../../lib/wave'

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
const auth = useAuthStore()
/** The author's name as the guest's invitation says it. */
const me = computed(() => auth.user?.firstName?.trim() || auth.user?.username || t('share.author'))
const label = computed(() =>
  result.value
    ? t('share.quiz.answered', { date: formatDate(result.value.answeredAt, { day: 'numeric', month: 'long' }) })
    : t('share.link.preview', { name: props.name }),
)
/** Under the actions: waiting for the answer and until when, or what leaves the report. */
const note = computed(() => {
  if (!live.value || result.value) return t('share.quiz.privacy')
  const until = live.value.expiresAt
    ? t('share.until', { date: formatDate(live.value.expiresAt, { day: 'numeric', month: 'long' }) })
    : ''
  return [t('share.quiz.waiting'), until].filter(Boolean).join(', ')
})
const invitation = wave(4, 48)

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
    <div class="quiz-step__preview">
      <p class="quiz-step__label">{{ label }}</p>
      <div class="quiz-step__poster">
        <b class="quiz-step__title">
          {{
            result && result.score !== null
              ? t('publicQuiz.score', { score: result.score, total: result.total })
              : result
                ? t('share.quiz.hidden')
                : t('publicQuiz.title', { name: me })
          }}
        </b>
        <span class="quiz-step__meta">{{
          result ? t('share.quiz.guessed') : tc('share.quiz.count', list.length)
        }}</span>
        <Pulse class="quiz-step__pulse" :data="invitation" :bars="48" :height="16" aria-hidden="true" />
      </div>
    </div>

    <UiGroup v-if="result?.correct">
      <UiListRow v-for="(item, index) in list" :key="item.id" :title="question(item.id)">
        <template #leading>
          <span
            class="quiz-step__mark"
            :class="{ 'is-right': result.correct[index] }"
            role="img"
            :aria-label="result.correct[index] ? t('publicQuiz.right') : t('publicQuiz.wrong')"
          >
            <Check v-if="result.correct[index]" aria-hidden="true" />
            <X v-else aria-hidden="true" />
          </span>
        </template>
      </UiListRow>
    </UiGroup>

    <div class="quiz-step__actions">
      <UiButton v-if="result" variant="primary" block :icon="RotateCw" :disabled="busy" @click="fresh = true">
        {{ t('share.quiz.again') }}
      </UiButton>
      <template v-else>
        <UiButton variant="primary" block :icon="Send" :loading="busy" @click="send">{{
          t('share.quiz.send')
        }}</UiButton>
        <UiButton variant="secondary" block :icon="Copy" :disabled="busy" @click="copy">
          {{ t('share.quiz.copy') }}
        </UiButton>
      </template>
      <UiButton variant="secondary" block :icon="Play" :to="`/quiz/${chatId}`">{{ t('share.quiz.self') }}</UiButton>
      <ShareFallback
        v-if="copyLink.fallback.value"
        :url="copyLink.fallback.value"
        :can-share="copyLink.canShare.value"
        @share="copyLink.share"
      />
      <p v-else class="quiz-step__note" role="status">{{ note }}</p>
    </div>
  </div>
</template>

<style scoped>
/* The same build as «Ссылка на отчёт»: a quiet line, the poster as the guest sees it, the actions, a quiet status. */
.quiz-step {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.quiz-step__preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.quiz-step__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.quiz-step__label,
.quiz-step__note {
  color: var(--text-muted);
  font: var(--text-label);
}

.quiz-step__note {
  text-align: center;
}

.quiz-step__poster {
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
  border-radius: var(--radius-card);
  background-color: var(--poster);
  background-image: var(--poster-image);
  color: var(--on-poster);
}

.quiz-step__title {
  overflow: hidden;
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quiz-step__meta {
  color: var(--on-poster-muted);
  font: var(--text-label);
}

.quiz-step__pulse {
  margin-top: var(--space-3);
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
</style>
