<script setup lang="ts">
import type { QuizQuestionDto, ShareLinkDto } from '@tg-analyzer/shared'
import { Check, ChevronRight, Copy, RotateCw, Send, X } from '../../lib/icons'

/**
 * «Угадайка», the second step of «Поделиться»: the questions are ready by themselves — send them in
 * Telegram or copy the link (it lives 30 days). Before the link exists you may guess yourself first: one pick per
 * question, «вы» or the other side, all or none. The picks are fixed with the link and the guest sees them only after
 * their own answers. After the answer: the score and right or wrong per question for both, if the other side agreed
 * to show them, and a way to start a new one.
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

type Pick = 'mine' | 'theirs'
const busy = ref(false)
/** «Новая угадайка»: the old link stays until the new one is made, the step shows the empty one meanwhile. */
const fresh = ref(false)
const live = computed(() => (fresh.value ? null : props.link))
const list = computed(() => live.value?.questions ?? props.questions)
const result = computed(() => live.value?.result ?? null)
const until = computed(() =>
  live.value?.expiresAt
    ? t('share.until', { date: formatDate(live.value.expiresAt, { day: 'numeric', month: 'long' }) })
    : '',
)

/** The author's own picks, made before the link exists. */
const betting = ref(false)
const picks = ref<(Pick | null)[]>([])
watch(
  list,
  (items) => {
    picks.value = items.map(() => null)
  },
  { immediate: true },
)
const picked = computed(() => picks.value.filter(Boolean).length)
/** Some picks but not all: the link waits until every question has one, or the picks are given up. */
const incomplete = computed(() => betting.value && picked.value > 0 && picked.value < list.value.length)
const authorPicks = computed(() =>
  betting.value && picked.value === list.value.length ? (picks.value as Pick[]) : undefined,
)
function skipBets() {
  betting.value = false
  picks.value = list.value.map(() => null)
}
const sideName = (side: Pick) => (side === 'mine' ? t('report.you') : props.name)

/** Marks of the author's own picks, in a link that is made but not answered. */
const madePicks = computed(() => live.value?.authorPicks ?? null)

/** Result: the author's right and wrong per question, when they guessed; the guest's, when shown. */
const authorCorrect = computed(() => result.value?.authorCorrect ?? null)
const authorScore = computed(() => authorCorrect.value?.filter(Boolean).length ?? null)
const tie = computed(
  () => authorScore.value !== null && result.value?.score != null && authorScore.value === result.value.score,
)
/** The first question both sides missed: they named the same wrong person. */
const bothMissed = computed(() => {
  const guest = result.value?.correct
  const author = authorCorrect.value
  if (!guest || !author) return null
  const at = list.value.findIndex((_, index) => !guest[index] && !author[index])
  const item = list.value[at]
  if (!item) return null
  return t('share.quiz.bothMissed', {
    question: question(item.id),
    who: item.answer === 'mine' ? t('report.you') : props.name,
  })
})

const note = computed(() => (authorPicks.value || madePicks.value ? 'share.quiz.privacyBets' : 'share.quiz.privacy'))

async function create(): Promise<ShareLinkDto | null> {
  busy.value = true
  try {
    const link = await api('POST /api/v1/reports/:chatId/links', {
      params: { chatId: props.chatId },
      body: { kind: 'quiz', days: 30, ...(authorPicks.value ? { authorPicks: authorPicks.value } : {}) },
    })
    fresh.value = false
    skipBets()
    emit('update', link)
    return link
  } catch (error) {
    toast.error(errorMessage(error))
    return null
  } finally {
    busy.value = false
  }
}

/** «Новая угадайка»: back to the questions, so the picks can be made before the next guest answers. */
function again() {
  fresh.value = true
  skipBets()
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
          {{
            tie
              ? t('share.quiz.tie', { score: result.score, total: result.total })
              : t('publicQuiz.score', { score: result.score, total: result.total })
          }}
        </p>
        <p v-else class="quiz-step__title">{{ t('share.quiz.hidden') }}</p>
        <p class="quiz-step__text">
          {{
            [
              authorScore !== null && !tie && result.score !== null
                ? t('share.quiz.versus', { score: authorScore, total: result.total })
                : '',
              t('share.quiz.answered', { date: formatDate(result.answeredAt, { day: 'numeric', month: 'long' }) }),
            ]
              .filter(Boolean)
              .join(' · ')
          }}
        </p>
      </template>
      <template v-else>
        <p class="quiz-step__title">{{ t('share.quiz.lead', { name }) }}</p>
        <p class="quiz-step__text">
          {{ live ? [t('share.quiz.waiting'), until].filter(Boolean).join(', ') : tc('share.quiz.ready', list.length) }}
        </p>
      </template>
    </div>

    <p v-if="result && bothMissed" class="quiz-step__callout" role="status">{{ bothMissed }}</p>
    <p v-else-if="result && !authorCorrect" class="quiz-step__callout" role="status">{{ t('share.quiz.noBets') }}</p>

    <!-- Own picks: a row that opens them, or the explanation and the way back. Only before the link exists. -->
    <UiGroup v-if="!live && !betting">
      <UiListRow
        as="button"
        :title="t('share.quiz.bets.add')"
        :subtitle="t('share.quiz.bets.addHint', { name })"
        @click="betting = true"
      >
        <template #trailing><ChevronRight aria-hidden="true" /></template>
      </UiListRow>
    </UiGroup>
    <div v-else-if="!live" class="quiz-step__bets">
      <div class="quiz-step__bets-copy">
        <p class="quiz-step__bets-title">{{ t('share.quiz.bets.title') }}</p>
        <p class="quiz-step__text">
          {{ incomplete ? t('share.quiz.bets.incomplete') : t('share.quiz.bets.hint', { name }) }}
        </p>
      </div>
      <UiButton variant="quiet" size="sm" @click="skipBets">{{ t('share.quiz.bets.skip') }}</UiButton>
    </div>
    <p v-if="authorCorrect" class="quiz-step__text quiz-step__legend">{{ t('share.quiz.resultLegend', { name }) }}</p>

    <ol class="quiz-step__list">
      <li v-for="(item, index) in list" :key="item.id">
        <span v-if="result?.correct" class="quiz-step__marks">
          <span
            v-if="authorCorrect"
            class="quiz-step__mark"
            :class="{ 'is-right': authorCorrect[index] }"
            role="img"
            :aria-label="authorCorrect[index] ? t('publicQuiz.right') : t('publicQuiz.wrong')"
          >
            <Check v-if="authorCorrect[index]" aria-hidden="true" />
            <X v-else aria-hidden="true" />
          </span>
          <span
            class="quiz-step__mark"
            :class="{ 'is-right': result.correct[index] }"
            role="img"
            :aria-label="result.correct[index] ? t('publicQuiz.right') : t('publicQuiz.wrong')"
          >
            <Check v-if="result.correct[index]" aria-hidden="true" />
            <X v-else aria-hidden="true" />
          </span>
        </span>
        <span v-else class="quiz-step__number" aria-hidden="true">{{ index + 1 }}</span>
        <span class="quiz-step__question">{{ question(item.id) }}</span>

        <span v-if="betting && !live" class="quiz-step__picks" role="radiogroup" :aria-label="question(item.id)">
          <button
            v-for="side in ['mine', 'theirs'] as const"
            :key="side"
            type="button"
            role="radio"
            class="quiz-step__pick"
            :class="{ 'is-on': picks[index] === side }"
            :aria-checked="picks[index] === side"
            :aria-label="t('share.quiz.pickAria', { question: question(item.id), name: sideName(side) })"
            @click="picks[index] = side"
          >
            <UiAvatar :title="sideName(side)" :side="side" size="sm" />
          </button>
        </span>
        <UiAvatar
          v-else-if="madePicks && !result && madePicks[index]"
          :title="sideName(madePicks[index]!)"
          :side="madePicks[index]!"
          size="sm"
        />
      </li>
    </ol>

    <div class="quiz-step__actions">
      <UiGroup>
        <UiListRow v-if="result" as="button" :title="t('share.quiz.again')" :disabled="busy" @click="again">
          <template #leading><RotateCw aria-hidden="true" /></template>
        </UiListRow>
        <template v-else>
          <UiListRow as="button" :title="t('share.quiz.send')" :disabled="busy || incomplete" @click="send">
            <template #leading><Send aria-hidden="true" /></template>
          </UiListRow>
          <UiListRow as="button" :title="t('share.quiz.copy')" :disabled="busy || incomplete" @click="copy">
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
      <p class="quiz-step__note">{{ t(note) }}</p>
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
  text-align: center;
}

/* What the two answers had in common: a quiet well under the score. */
.quiz-step__callout {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-well);
  background: var(--fill-raised);
  font: var(--text-label);
}

/* The own picks, asked for: what it is, and the way out. */
.quiz-step__bets {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-well);
  background: var(--fill-raised);
}

.quiz-step__bets-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.quiz-step__bets-title {
  font: var(--text-label);
}

.quiz-step__legend {
  padding: 0 var(--space-1);
}

/* The questions as rows with hairlines: its number, or right and wrong after the answer. */
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

.quiz-step__marks,
.quiz-step__picks {
  display: flex;
  flex: none;
  gap: var(--space-1);
}

.quiz-step__number,
.quiz-step__mark {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--avatar-xs);
  height: var(--avatar-xs);
  border-radius: var(--radius-pill);
  background: var(--fill-raised);
  color: var(--text-muted);
  font: var(--text-caption);
  --icon-size: var(--icon-sm);
}

.quiz-step__mark.is-right {
  background: var(--you);
  color: var(--on-you);
}

/* One pick: «вы» or the other side; the chosen one keeps a ring. */
.quiz-step__pick {
  display: grid;
  place-items: center;
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  transition: transform var(--duration-press) var(--ease-standard);
}

.quiz-step__pick:active {
  transform: scale(var(--press-scale));
}

.quiz-step__pick.is-on {
  box-shadow: var(--ring-selected);
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
