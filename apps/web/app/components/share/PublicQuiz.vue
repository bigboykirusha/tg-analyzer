<script setup lang="ts">
import { buildApiPath, type PublicQuizDto } from '@tg-analyzer/shared'
import { ofetch } from 'ofetch'
import { Check } from '../../lib/icons'
import { wave } from '../../lib/wave'

/**
 * The quiz as the other side plays it, without signing in: one poster-coloured screen at a time — the
 * invitation, the questions «кто из вас чаще» with the answer right after each pick, then the score.
 * The author sees the score (the invitation says so). «Вы» is always the one who opened the link.
 */
const props = defineProps<{ quiz: PublicQuizDto; token: string }>()
const { t, tc } = useI18n()
const { question, value } = useQuizText()

type Pick = 'author' | 'guest'
const stage = ref<'intro' | 'question' | 'done'>(props.quiz.answered ? 'done' : 'intro')
const index = ref(0)
const picks = ref<Pick[]>(props.quiz.answered?.picks ?? [])
const sending = ref(false)
const answered = ref(props.quiz.answered)

const total = computed(() => props.quiz.questions.length)
const current = computed(() => props.quiz.questions[index.value]!)
const picked = computed(() => picks.value[index.value] ?? null)
const right = (at: number) => picks.value[at] === props.quiz.questions[at]?.answer
const score = computed(() => answered.value?.score ?? picks.value.filter((_, at) => right(at)).length)
const verdict = computed(() => {
  const share = score.value / Math.max(1, total.value)
  return t(
    share >= 0.8 ? 'publicQuiz.verdict.high' : share >= 0.4 ? 'publicQuiz.verdict.mid' : 'publicQuiz.verdict.low',
  )
})
const sides = computed(() => [
  { key: 'author' as const, name: props.quiz.author },
  { key: 'guest' as const, name: t('publicQuiz.me') },
])
/** «Верно — это вы, 81 раз против 66.» */
const reveal = computed(() => {
  const item = current.value
  const loser: Pick = item.answer === 'author' ? 'guest' : 'author'
  return t(right(index.value) ? 'publicQuiz.revealRight' : 'publicQuiz.revealWrong', {
    who: item.answer === 'author' ? props.quiz.author : t('publicQuiz.youAre'),
    winner: value(item.unit, item[item.answer]),
    loser: value(item.unit, item[loser]),
  })
})
/** The questions the guest missed, for the last screen. */
const missed = computed(() => props.quiz.questions.filter((_, at) => !right(at)).length)

function pick(side: Pick) {
  if (picked.value) return
  picks.value[index.value] = side
}

async function next() {
  if (index.value + 1 < total.value) {
    index.value += 1
    return
  }
  sending.value = true
  try {
    const result = await ofetch<PublicQuizDto>(buildApiPath('/api/v1/public/:token/answer', { token: props.token }), {
      method: 'POST',
      body: { picks: picks.value, share: true },
    })
    answered.value = result.answered
  } catch {
    // Answered from another tab, or the link went away: the score on screen stays the guest's own.
  } finally {
    sending.value = false
    stage.value = 'done'
  }
}
const invitation = wave(4, 40)
</script>

<template>
  <section class="quiz" data-poster>
    <div class="quiz__in">
      <template v-if="stage === 'intro'">
        <div class="quiz__body">
          <Pulse :data="invitation" :bars="40" :height="40" />
          <h1 class="quiz__figure">{{ t('publicQuiz.title', { name: quiz.author }) }}</h1>
          <p class="quiz__text">{{ tc('publicQuiz.lede', total) }}</p>
        </div>
        <div class="quiz__foot">
          <p class="quiz__note">{{ t('publicQuiz.note', { name: quiz.author }) }}</p>
          <UiButton variant="primary" block @click="stage = 'question'">{{ t('publicQuiz.start') }}</UiButton>
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
          <h1 class="quiz__figure">{{ question(current.id) }}</h1>
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
                v-if="side.key === 'author'"
                :title="quiz.author"
                side="mine"
                :initial="quiz.author.trim().charAt(0).toLocaleUpperCase()"
                size="md"
              />
              <UiAvatar v-else :title="side.name" side="theirs" size="md" />
              <span class="choice__name">{{ side.name }}</span>
              <span v-if="picked === side.key" class="choice__value">
                <Check aria-hidden="true" />{{ value(current.unit, current[side.key]) }}
              </span>
            </button>
          </div>
          <p class="quiz__reveal" role="status">{{ picked ? reveal : '' }}</p>
        </div>
        <div class="quiz__foot">
          <UiButton variant="primary" block :disabled="!picked" :loading="sending" @click="next">
            {{ index + 1 < total ? t('publicQuiz.next') : t('publicQuiz.finish') }}
          </UiButton>
        </div>
      </template>

      <template v-else>
        <div class="quiz__body">
          <p class="quiz__note quiz__note--start">{{ t('publicQuiz.from', { name: quiz.author }) }}</p>
          <p class="quiz__score">{{ t('publicQuiz.score', { score, total }) }}</p>
          <h1 class="quiz__verdict">{{ verdict }}</h1>
          <p class="quiz__text">
            {{
              missed
                ? tc('publicQuiz.missed', missed, { name: quiz.author })
                : t('publicQuiz.allRight', { name: quiz.author })
            }}
          </p>
        </div>
        <div class="quiz__foot">
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
  --them: var(--on-them);
  display: flex;
  flex: 1;
  flex-direction: column;
  margin: calc(-1 * var(--page-top)) 0 calc(-1 * var(--page-bottom));
  background: var(--poster);
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
  color: var(--text);
  text-align: left;
  transition: transform var(--duration-press) var(--ease-standard);
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

/* The line keeps its height before the answer, so nothing jumps when it arrives. */
.quiz__reveal {
  min-height: calc(var(--space-12));
  font: var(--text-label);
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
