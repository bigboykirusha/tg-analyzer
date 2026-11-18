<script setup lang="ts">
import { buildApiPath, type PublicQuizDto } from '@tg-analyzer/shared'
import { ofetch } from 'ofetch'
import { Check, ChevronDown, X } from '../../lib/icons'
import { wave } from '../../lib/wave'

/**
 * The quiz, one poster-coloured screen at a time: the questions «кто из вас» with the answer right after each pick,
 * then the score. Two ways to play it, one game (17.11: the author's bets before the link are gone):
 * - a guest by link (`token`): an invitation first, the score goes to the author, «Вы» is the one who opened it;
 * - the author alone (`self`): straight to the questions, nothing is sent or stored, `quiz.author` is the other side.
 */
const props = defineProps<{
  quiz: PublicQuizDto
  token?: string
  /** The author plays their own report; the last screen leads back to it. */
  self?: boolean
  back?: string
}>()
const { t, tc } = useI18n()
const { question, value } = useQuizText()

type Pick = 'author' | 'guest'
const stage = ref<'intro' | 'question' | 'done'>(props.quiz.answered ? 'done' : props.self ? 'question' : 'intro')
const index = ref(0)
const picks = ref<Pick[]>(props.quiz.answered?.picks ?? [])
const sending = ref(false)
const sendFailed = ref(false)
const answered = ref(props.quiz.answered)
/** The page has its own title in the bar when the author plays: the quiz's big lines are not the h1 then. */
const heading = computed(() => (props.self ? 'h2' : 'h1'))

const total = computed(() => props.quiz.questions.length)
const current = computed(() => props.quiz.questions[index.value]!)
const picked = computed(() => picks.value[index.value] ?? null)
const right = (at: number) => picks.value[at] === props.quiz.questions[at]?.answer
const score = computed(() => answered.value?.score ?? picks.value.filter((_, at) => right(at)).length)
const verdict = computed(() => {
  const share = score.value / Math.max(1, total.value)
  if (share >= 0.8) return t('publicQuiz.verdict.high')
  if (share > 0.5) return t('publicQuiz.verdict.mid')
  if (share === 0.5) return t('publicQuiz.verdict.half')
  return t('publicQuiz.verdict.low')
})
/** The player's side is ink and comes first; the other side wears the person's colour. */
const sides = computed(() => {
  const author = { key: 'author' as const, name: props.quiz.author }
  const me = { key: 'guest' as const, name: t('publicQuiz.me') }
  return props.self ? [me, author] : [author, me]
})
/** «Верно — это вы, 81 раз против 66.» */
const who = (answer: Pick) => (answer === 'author' ? props.quiz.author : t('publicQuiz.youAre'))
/** Under 1.25× the report calls it «поровну» (useVersus): the quiz still has an answer, and says it was close. */
const close = (a: number, b: number) => Math.max(a, b) < 1.25 * Math.min(a, b)
const reveal = computed(() => {
  const item = current.value
  const loser: Pick = item.answer === 'author' ? 'guest' : 'author'
  const ok = right(index.value)
  if (item.unit === 'fact')
    return t(ok ? 'publicQuiz.revealFactRight' : 'publicQuiz.revealFactWrong', { who: who(item.answer) })
  const near = close(item.author, item.guest)
  return t(
    near
      ? ok
        ? 'publicQuiz.revealCloseRight'
        : 'publicQuiz.revealCloseWrong'
      : ok
        ? 'publicQuiz.revealRight'
        : 'publicQuiz.revealWrong',
    { who: who(item.answer), winner: value(item.unit, item[item.answer]), loser: value(item.unit, item[loser]) },
  )
})

function pick(side: Pick) {
  if (picked.value) return
  picks.value[index.value] = side
}

/** A new screen of the game starts at its top, not where the last button was pressed. */
const toTop = () => nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))

function restart() {
  picks.value = []
  index.value = 0
  stage.value = 'question'
  toTop()
}

async function next() {
  if (sending.value) return
  if (index.value + 1 < total.value) {
    index.value += 1
    toTop()
    return
  }
  if (props.self || !props.token) {
    stage.value = 'done'
    toTop()
    return
  }
  sending.value = true
  let result: PublicQuizDto | null
  try {
    result = await ofetch<PublicQuizDto>(buildApiPath('/api/v1/public/:token/answer', { token: props.token }), {
      method: 'POST',
      body: { picks: picks.value, share: true },
    })
  } catch {
    // The server may have saved an answer even if the response was lost or another tab answered first.
    result = await ofetch<PublicQuizDto>(buildApiPath('/api/v1/public/:token', { token: props.token })).catch(
      () => null,
    )
  } finally {
    sending.value = false
  }
  if (!result?.answered) {
    sendFailed.value = true
    return
  }
  picks.value = result.answered.picks
  answered.value = result.answered
  stage.value = 'done'
  toTop()
}
const invitation = wave(4, 40)
</script>

<template>
  <section class="quiz" :class="{ 'quiz--self': self }" data-poster>
    <div class="quiz__in">
      <template v-if="stage === 'intro'">
        <div class="quiz__body">
          <Pulse :data="invitation" :bars="40" :height="40" />
          <h1 class="quiz__figure">{{ t('publicQuiz.title', { name: quiz.author }) }}</h1>
          <p class="quiz__text">{{ tc('publicQuiz.lede', total) }}</p>
        </div>
        <div class="quiz__foot">
          <p class="quiz__note">{{ t('publicQuiz.note', { name: quiz.author }) }}</p>
          <UiButton variant="primary" block @click="restart">{{ t('publicQuiz.start') }}</UiButton>
        </div>
      </template>

      <template v-else-if="stage === 'question'">
        <div class="quiz__top">
          <div
            class="quiz__steps"
            role="progressbar"
            aria-valuemin="1"
            :aria-valuemax="total"
            :aria-valuenow="index + 1"
            :aria-label="t('publicQuiz.step', { n: index + 1, total })"
          >
            <i v-for="at in total" :key="at" :class="{ 'is-on': at - 1 <= index }" />
          </div>
          <p class="quiz__note quiz__note--start">{{ t('publicQuiz.step', { n: index + 1, total }) }}</p>
        </div>
        <div class="quiz__body">
          <component :is="heading" class="quiz__figure">{{ question(current.id) }}</component>
          <div class="quiz__choices" role="radiogroup" :aria-label="t('publicQuiz.answer')">
            <button
              v-for="side in sides"
              :key="side.key"
              type="button"
              role="radio"
              class="choice"
              :class="{ 'is-on': picked === side.key }"
              :aria-checked="picked === side.key"
              :disabled="Boolean(picked)"
              @click="pick(side.key)"
            >
              <UiAvatar
                :title="side.name"
                :side="side.key === sides[0]!.key ? 'mine' : 'theirs'"
                :initial="side.name.trim().charAt(0).toLocaleUpperCase()"
                size="md"
              />
              <span class="choice__name">{{ side.name }}</span>
              <span v-if="picked && (side.key === current.answer || side.key === picked)" class="choice__value tnum">
                <Check v-if="side.key === current.answer" aria-hidden="true" />
                <X v-else aria-hidden="true" />
                <template v-if="current.unit !== 'fact'">{{ value(current.unit, current[side.key]) }}</template>
              </span>
            </button>
          </div>
          <div class="quiz__reveal">
            <p role="status">{{ picked ? reveal : '' }}</p>
            <ReportLine
              v-if="picked && current.unit !== 'fact'"
              class="quiz__compare"
              :mine="current[sides[0]!.key]"
              :theirs="current[sides[1]!.key]"
              :left="value(current.unit, current[sides[0]!.key])"
              :right="value(current.unit, current[sides[1]!.key])"
              :left-name="sides[0]!.name"
              :right-name="sides[1]!.name"
              :bar="current.id !== 'fastest'"
            />
          </div>
        </div>
        <div class="quiz__foot">
          <p v-if="sendFailed" class="quiz__note" role="alert">{{ t('publicQuiz.sendFailed') }}</p>
          <UiButton variant="primary" block :disabled="!picked" :loading="sending" @click="next">
            {{ t(sendFailed ? 'common.retry' : index + 1 < total ? 'publicQuiz.next' : 'publicQuiz.finish') }}
          </UiButton>
        </div>
      </template>

      <template v-else>
        <div class="quiz__body">
          <p v-if="!self" class="quiz__note quiz__note--start">{{ t('publicQuiz.from', { name: quiz.author }) }}</p>
          <p class="quiz__score tnum">{{ t('publicQuiz.score', { score, total }) }}</p>
          <component :is="heading" class="quiz__verdict">{{ verdict }}</component>
          <p v-if="!self && answered" class="quiz__note quiz__note--start">
            {{ t('publicQuiz.resultSaved') }}
          </p>
          <details class="quiz__review">
            <summary class="quiz__summary">
              {{ t('publicQuiz.answers') }}
              <ChevronDown aria-hidden="true" />
            </summary>
            <ol class="quiz__answers" :aria-label="t('publicQuiz.answers')">
              <li v-for="(item, at) in quiz.questions" :key="item.id">
                <span
                  class="mark"
                  :class="{ 'is-right': right(at) }"
                  role="img"
                  :aria-label="right(at) ? t('publicQuiz.right') : t('publicQuiz.wrong')"
                >
                  <Check v-if="right(at)" aria-hidden="true" />
                  <X v-else aria-hidden="true" />
                </span>
                <span class="quiz__question">{{ question(item.id) }}</span>
                <span class="quiz__who">{{ item.answer === 'author' ? quiz.author : t('report.you') }}</span>
              </li>
            </ol>
          </details>
        </div>
        <div v-if="self" class="quiz__foot">
          <UiButton variant="primary" block :to="back">{{ t('quizSelf.back') }}</UiButton>
          <UiButton variant="secondary" block @click="restart">{{ t('quizSelf.again') }}</UiButton>
        </div>
        <div v-else class="quiz__foot">
          <UiButton variant="primary" block to="/login">{{ t('publicReport.cta') }}</UiButton>
          <UiButton variant="secondary" block to="/">{{ t('publicShare.about') }}</UiButton>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
/* One poster-coloured screen: the header above it takes the colour (SiteHeader over `data-poster`). */
.quiz {
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  --you: var(--on-poster);
  --on-you: var(--btn-ink-text);
  --them: var(--on-them);
  --them-ink: var(--on-them);
  /*
   * The poster is one in both themes (17.11), so what stands on it — the answers, the list — takes its light tone and
   * its ink, as the light tiles of «Главное» do, not the page's surface (dark rows on a bright poster at night).
   */
  --surface: var(--poster-light);
  --text: var(--on-poster);
  --text-muted: var(--on-poster-muted);
  --fill-raised: var(--on-poster-chip);
  --ring-card: var(--ring-on-poster);
  --focus-ring-color: var(--on-poster);
  display: flex;
  flex: 1;
  flex-direction: column;
  margin: calc(-1 * var(--page-top)) 0 calc(-1 * var(--page-bottom));
  background-color: var(--poster);
  background-image: var(--poster-image);
  color: var(--on-poster);
}

.quiz__in {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-6);
  width: 100%;
  max-width: calc(var(--card-focus) + var(--page-gutter) * 2);
  min-height: calc(100dvh - var(--topbar-height));
  margin: 0 auto;
  padding: var(--space-3) var(--page-gutter) calc(var(--space-8) + env(safe-area-inset-bottom, 0px));
}

/*
 * In the cabinet the bar floats over the poster on a phone and is gone on a computer: the game is the whole screen
 * either way (the guest's page grows to fill its own layout instead).
 */
.quiz--self .quiz__in {
  min-height: 100dvh;
}

/*
 * A computer (18.11): in the cabinet the poster is a rounded card in the column, as the report's poster is there —
 * not a fill to the window's edges with the progress glued to the top. The guest's page keeps its own full width.
 */
@media (min-width: 901px) {
  .quiz--self {
    margin: 0 var(--page-gutter);
    border-radius: var(--radius-poster);
  }

  .quiz--self .quiz__in {
    min-height: calc(100dvh - var(--page-top) - var(--page-bottom));
    padding-top: var(--space-6);
  }
}

/* Both public and workspace headers float over the poster on phones. */
@media (max-width: 900px) {
  .quiz__in {
    min-height: 100dvh;
    padding-top: calc(var(--topbar-height) + env(safe-area-inset-top, 0px) + var(--space-3));
  }
}

.quiz__top {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.quiz__steps {
  display: flex;
  gap: var(--space-1);
}

.quiz__steps i {
  flex: 1;
  height: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--on-poster-faint);
}

.quiz__steps i.is-on {
  background: var(--on-poster);
}

.quiz__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-4);
  min-width: 0;
}

.quiz__figure {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
  text-wrap: balance;
}

.quiz__score {
  font: var(--text-display);
  letter-spacing: var(--tracking-display);
}

.quiz__verdict {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  text-wrap: balance;
}

.quiz__text {
  color: var(--on-poster-muted);
  font: var(--text-body);
  text-wrap: pretty;
}

.quiz__note {
  color: var(--on-poster-muted);
  font: var(--text-label);
  text-align: center;
}

.quiz__note--start {
  text-align: left;
}

.quiz__choices {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-4);
}

/* An answer: a white row on the poster; the picked one keeps an ink ring and shows its number. */
.choice {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--row-height);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--ring-card);
  color: var(--text);
  text-align: left;
  transition:
    box-shadow var(--transition-fast),
    transform var(--duration-press) var(--ease-standard);
}

.choice:not(:disabled):active {
  transform: scale(var(--press-scale));
}

.choice.is-on {
  box-shadow: var(--ring-selected);
}

.choice__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font: var(--text-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.choice__value {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--space-1);
  color: var(--text-muted);
  font: var(--text-label);
  --icon-size: var(--icon-sm);
}

/* The block keeps its height before the answer, so nothing jumps when it arrives. */
.quiz__reveal {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: calc(var(--space-12) * 2);
  font: var(--text-label);
}

.quiz__compare {
  color: var(--on-poster);
}

.quiz__review {
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--ring-card);
  color: var(--text);
}

.quiz__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-height: var(--control-md);
  padding: var(--space-2) var(--space-4);
  border-radius: inherit;
  font: var(--text-label);
  list-style: none;
  cursor: pointer;
}

.quiz__summary::-webkit-details-marker {
  display: none;
}

.quiz__summary svg {
  --icon-size: var(--icon-sm);
  transition: transform var(--transition-fast);
}

.quiz__review[open] .quiz__summary svg {
  transform: rotate(180deg);
}

.quiz__answers {
  margin: 0 var(--space-4);
  padding: 0 0 var(--space-1);
  box-shadow: var(--divider-top);
}

.quiz__answers li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--control-md);
  padding: var(--space-1) 0;
  box-shadow: var(--divider-bottom);
  font: var(--text-label);
}

.quiz__answers li:last-child {
  box-shadow: none;
}

.quiz__question {
  flex: 1;
  min-width: 0;
}

.quiz__who {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 40%;
  color: var(--text-muted);
  text-align: right;
  overflow-wrap: anywhere;
}

.mark {
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

.mark.is-right {
  background: var(--text);
  color: var(--surface);
}

.quiz__foot {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.quiz__foot .quiz__note {
  padding-bottom: var(--space-1);
}

@media (hover: hover) and (pointer: fine) {
  .choice:not(:disabled):hover {
    box-shadow: var(--ring-strong);
  }
}
</style>
