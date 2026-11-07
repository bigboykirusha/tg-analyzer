<script setup lang="ts">
import { buildApiPath, type PublicQuizDto } from '@tg-analyzer/shared'
import { ofetch } from 'ofetch'
import { Check, Lock, X } from '../../lib/icons'

/**
 * The quiz as the other side plays it, on its own page without signing in: an invitation, five
 * «кто из вас чаще» questions with the answer right after each pick, then the score with a switch
 * «Показать счёт» (on by default) and «Готово». «Вы» is always the one who opened the link.
 */
const props = defineProps<{ quiz: PublicQuizDto; token: string }>()
const { t, tc } = useI18n()
const { question, value } = useQuizText()

type Pick = 'author' | 'guest'
const stage = ref<'intro' | 'question' | 'reveal' | 'result' | 'done'>(props.quiz.answered ? 'done' : 'intro')
const index = ref(0)
const picks = ref<Pick[]>(props.quiz.answered?.picks ?? [])
const share = ref(true)
const sending = ref(false)
const answered = ref(props.quiz.answered)

const total = computed(() => props.quiz.questions.length)
const current = computed(() => props.quiz.questions[index.value]!)
const right = (at: number) => picks.value[at] === props.quiz.questions[at]?.answer
const score = computed(() => answered.value?.score ?? picks.value.filter((_, at) => right(at)).length)
const verdict = computed(() => {
  const share = score.value / Math.max(1, total.value)
  return t(
    share >= 0.8 ? 'publicQuiz.verdict.high' : share >= 0.4 ? 'publicQuiz.verdict.mid' : 'publicQuiz.verdict.low',
  )
})
const who = (side: Pick) => (side === 'author' ? props.quiz.author : t('publicQuiz.you'))
const reveal = computed(() => {
  const item = current.value
  const winner = item.answer
  const loser: Pick = winner === 'author' ? 'guest' : 'author'
  return t('publicQuiz.reveal', {
    who: who(winner),
    winner: value(item.unit, item[winner]),
    loser: value(item.unit, item[loser]),
  })
})

function pick(side: Pick) {
  picks.value[index.value] = side
  stage.value = 'reveal'
}

function next() {
  if (index.value + 1 < total.value) {
    index.value += 1
    stage.value = 'question'
  } else stage.value = 'result'
}

async function finish() {
  sending.value = true
  try {
    const result = await ofetch<PublicQuizDto>(buildApiPath('/api/v1/public/:token/answer', { token: props.token }), {
      method: 'POST',
      body: { picks: picks.value, share: share.value },
    })
    answered.value = result.answered
  } catch {
    // Answered from another tab, or the link went away: the score on screen stays the guest's own.
  } finally {
    sending.value = false
    stage.value = 'done'
  }
}
</script>

<template>
  <div class="quiz">
    <template v-if="stage === 'intro'">
      <section class="tile tile--ink quiz__card">
        <div class="quiz__pair" aria-hidden="true">
          <UiAvatar :title="quiz.author" size="md" />
          <UiAvatar side="mine" :title="t('publicQuiz.you')" size="md" />
        </div>
        <p class="t-small t-muted">{{ t('publicQuiz.from', { name: quiz.author }) }}</p>
        <h1 class="quiz__title">{{ t('publicQuiz.title') }}</h1>
        <p class="t-small t-muted">{{ tc('publicQuiz.length', total) }}</p>
      </section>
      <UiButton variant="primary" size="lg" block @click="stage = 'question'">{{ t('publicQuiz.start') }}</UiButton>
      <p class="quiz__note"><Lock aria-hidden="true" />{{ t('publicQuiz.note') }}</p>
    </template>

    <template v-else-if="stage === 'question' || stage === 'reveal'">
      <div class="quiz__top">
        <span class="t-small t-muted">
          {{ t('publicQuiz.step', { n: index + 1, total }) }}
          <template v-if="stage === 'reveal'">
            · {{ right(index) ? t('publicQuiz.right') : t('publicQuiz.wrong') }}
          </template>
        </span>
        <div class="quiz__steps" aria-hidden="true">
          <i
            v-for="at in total"
            :key="at"
            :class="{
              'is-done': at - 1 < index || (at - 1 === index && stage === 'reveal'),
              'is-on': at - 1 === index,
            }"
          />
        </div>
      </div>
      <section class="tile quiz__card">
        <h1 class="quiz__title">{{ stage === 'reveal' ? reveal : question(current.id) }}</h1>
        <div class="quiz__choices">
          <button
            v-for="side in ['guest', 'author'] as const"
            :key="side"
            type="button"
            class="quiz__choice"
            :class="{
              'is-picked': stage === 'reveal' && picks[index] === side,
              'is-faded': stage === 'reveal' && current.answer !== side,
            }"
            :disabled="stage === 'reveal'"
            @click="pick(side)"
          >
            <UiAvatar v-if="side === 'author'" :title="quiz.author" size="lg" />
            <UiAvatar v-else side="mine" :title="t('publicQuiz.you')" size="lg" />
            <span>{{ who(side) }}</span>
          </button>
        </div>
        <ReportLine
          v-if="stage === 'reveal'"
          :mine="current.guest"
          :theirs="current.author"
          :left="value(current.unit, current.guest)"
          :right="value(current.unit, current.author)"
        />
      </section>
      <UiButton v-if="stage === 'reveal'" variant="primary" size="lg" block @click="next">
        {{ index + 1 < total ? t('publicQuiz.next') : t('publicQuiz.finish') }}
      </UiButton>
    </template>

    <template v-else>
      <section class="tile tile--ink quiz__card">
        <p class="t-small t-muted">{{ stage === 'done' && quiz.answered ? t('publicQuiz.answered') : quiz.author }}</p>
        <div class="quiz__figure t-num">{{ t('publicQuiz.score', { score, total }) }}</div>
        <p class="quiz__title">{{ verdict }}</p>
        <ol class="quiz__list">
          <li v-for="(item, at) in quiz.questions" :key="item.id">
            <span class="quiz__mark" :class="right(at) ? 'is-right' : 'is-wrong'">
              <Check v-if="right(at)" aria-hidden="true" />
              <X v-else aria-hidden="true" />
            </span>
            {{ question(item.id) }}
          </li>
        </ol>
      </section>
      <template v-if="stage === 'result'">
        <div class="tile quiz__consent">
          <UiSwitch
            v-model="share"
            :label="t('publicQuiz.share', { name: quiz.author })"
            :hint="t('publicQuiz.shareHint')"
          />
        </div>
        <UiButton variant="primary" size="lg" block :loading="sending" @click="finish">
          {{ t('publicQuiz.done') }}
        </UiButton>
      </template>
      <template v-else>
        <UiButton variant="primary" size="lg" block to="/login">{{ t('publicQuiz.cta') }}</UiButton>
        <p class="t-small t-muted quiz__center">{{ t('publicQuiz.ctaNote') }}</p>
      </template>
    </template>
  </div>
</template>

<style scoped>
/* A phone-width column in the middle on every screen: the quiz is a card game, not a report. */
.quiz {
  display: grid;
  gap: var(--space-4);
  width: 100%;
  max-width: var(--card-focus);
  margin: 0 auto;
}

.quiz__card {
  gap: var(--space-3);
}

.quiz__pair {
  display: flex;
}

.quiz__pair > * + * {
  margin-left: calc(-1 * var(--space-2));
  /* A ring in the card's colour cuts the second face out of the first. */
  outline: 3px solid var(--tile-ink);
}

.quiz__title {
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
  text-wrap: balance;
}

.quiz__figure {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.quiz__top {
  display: grid;
  gap: var(--space-2);
}

.quiz__steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  grid-auto-flow: column;
  gap: var(--space-1);
}

.quiz__steps i {
  height: var(--bar-height);
  border-radius: var(--radius-full);
  background: var(--border-strong);
}

.quiz__steps i.is-done {
  background: var(--text);
}

.quiz__steps i.is-on:not(.is-done) {
  background: var(--them);
}

.quiz__choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.quiz__choice {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: none;
  color: var(--text);
  font: var(--text-title);
  cursor: pointer;
}

.quiz__choice:disabled {
  cursor: default;
}

.quiz__choice.is-picked {
  border-color: var(--text);
  background: var(--surface-2);
}

.quiz__choice.is-faded {
  opacity: var(--opacity-disabled);
}

.quiz__list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  font: var(--text-small);
  list-style: none;
}

.quiz__list li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.quiz__mark {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--icon-lg);
  height: var(--icon-lg);
  border-radius: var(--radius-full);
  background: var(--surface-2);
  color: var(--text-muted);
}

.quiz__mark.is-right {
  background: var(--them);
  color: var(--surface);
}

.quiz__consent {
  padding-block: var(--space-2);
}

.quiz__note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-caption);
}

.quiz__center {
  text-align: center;
}

@media (hover: hover) and (pointer: fine) {
  .quiz__choice:not(:disabled):hover {
    border-color: var(--text);
  }
}
</style>
