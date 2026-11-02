<script setup lang="ts">
import type { QuizQuestionDto, ReportDto } from '@tg-analyzer/shared'
import type { Comparison } from './ReportCompare.vue'

/** «Угадайка»: five «who more?» questions, then the score. The answers come from the report. */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatDecimal, formatPercent, formatDuration } = useI18n()

const questions = computed(() => props.data.derived.quiz ?? [])
const name = computed(() => props.data.summary.title)
const step = ref(0)
const picked = ref<'mine' | 'theirs' | null>(null)
const score = ref(0)

const current = computed<QuizQuestionDto | null>(() => questions.value[step.value] ?? null)
const last = computed(() => step.value + 1 >= questions.value.length)

function show(question: QuizQuestionDto, side: 'mine' | 'theirs') {
  const value = question[side]
  switch (question.unit) {
    case 'percent':
      return formatPercent(value)
    case 'seconds':
      return formatDuration(value)
    case 'words':
      return formatDecimal(value)
    default:
      return formatNumber(value)
  }
}

/** The answer as one comparison row: the bar is each side's share, except for speed, where a bar would read backwards. */
const reveal = computed<Comparison[]>(() => {
  const question = current.value
  if (!question || !picked.value) return []
  const total = question.mine + question.theirs
  return [
    {
      key: question.id,
      label: t('report.mix.quizAnswer'),
      mine: show(question, 'mine'),
      theirs: show(question, 'theirs'),
      minePct: question.id === 'fastest' || !total ? null : Math.round((question.mine / total) * 100),
      verdict: picked.value === question.answer ? t('report.mix.quizRight') : t('report.mix.quizWrong'),
    },
  ]
})

function pick(side: 'mine' | 'theirs') {
  if (picked.value || !current.value) return
  picked.value = side
  if (side === current.value.answer) score.value += 1
}
function next() {
  picked.value = null
  step.value += 1
}
function again() {
  step.value = 0
  score.value = 0
  picked.value = null
}
</script>

<template>
  <ReportSection v-if="questions.length" :title="t('report.mix.quizTitle')" :text="t('report.mix.quizText')">
    <template v-if="current">
      <p class="quiz__ask">
        <span class="t-title">{{ t(`report.mix.quiz.${current.id}`) }}</span>
        <span class="quiz__step t-num">{{ step + 1 }} / {{ questions.length }}</span>
      </p>
      <div class="quiz__options">
        <UiButton
          v-for="side in ['mine', 'theirs'] as const"
          :key="side"
          size="lg"
          variant="secondary"
          :class="{ 'quiz__option--right': picked && current.answer === side }"
          :disabled="!!picked && current.answer !== side"
          @click="pick(side)"
        >
          {{ side === 'mine' ? t('report.you') : name }}
        </UiButton>
      </div>
      <template v-if="picked">
        <ReportCompare :their-name="name" :rows="reveal" />
        <div>
          <UiButton variant="soft" size="sm" @click="next">
            {{ last ? t('report.mix.quizResult') : t('report.mix.quizNext') }}
          </UiButton>
        </div>
      </template>
    </template>
    <template v-else>
      <p class="quiz__score t-num">{{ score }} / {{ questions.length }}</p>
      <p class="t-lede">{{ tc('report.mix.quizScore', score) }}</p>
      <div>
        <UiButton variant="soft" size="sm" @click="again">{{ t('report.mix.quizAgain') }}</UiButton>
      </div>
    </template>
  </ReportSection>
</template>

<style scoped>
.quiz__ask {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.quiz__step {
  color: var(--text-muted);
  font: var(--text-small);
}

.quiz__options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

/* The right side lights up in lime, the only accent a white card may carry. */
.quiz__option--right,
.quiz__option--right:disabled {
  border-color: var(--lime);
  background: var(--lime);
  color: var(--on-lime);
  opacity: 1;
}

.quiz__score {
  font: var(--text-figure);
  letter-spacing: -0.04em;
}
</style>
