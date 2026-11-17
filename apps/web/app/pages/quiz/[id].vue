<script setup lang="ts">
import type { PublicQuizDto, ReportDto } from '@tg-analyzer/shared'
import { hueOf } from '../../lib/hue'

/**
 * «Пройти самому» (17.11): the author plays the quiz of their own report — the same game the guest gets by link,
 * with the sides turned: «Я» is the author, the other side is the person. Nothing is sent and nothing is stored.
 */
definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const route = useRoute()
const { t } = useI18n()
const workspace = useWorkspaceStore()
const errorMessage = useErrorMessage()

const chatId = computed(() => String(route.params.id))
const data = ref<ReportDto | null>(workspace.openedReports[chatId.value] ?? null)
const loadError = ref<unknown>(null)
useSeoMeta({ title: () => t('share.quiz.short') })
useHead({ htmlAttrs: { 'data-hue': () => hueOf(chatId.value) } })

onMounted(async () => {
  try {
    data.value = await workspace.loadReport(chatId.value)
  } catch (error) {
    loadError.value = error
  }
})

/** The report's own questions, in the guest's terms: «author» is the other side here, «guest» is you. */
const quiz = computed<PublicQuizDto | null>(() => {
  const report = data.value
  if (!report || report.derived.quiz.length < 3) return null
  return {
    kind: 'quiz',
    author: report.summary.title,
    hue: 0,
    expiresAt: null,
    answered: null,
    questions: report.derived.quiz.map((question) => ({
      id: question.id,
      unit: question.unit,
      author: question.theirs,
      guest: question.mine,
      answer: question.answer === 'mine' ? 'guest' : 'author',
    })),
  }
})
const back = computed(() => `/chat/${chatId.value}`)
</script>

<template>
  <UiPageBar :title="t('share.quiz.short')" :back="back" bar />
  <PublicQuiz v-if="quiz" :key="chatId" :quiz="quiz" self :back="back" />
  <UiPageContainer v-else-if="loadError || (data && !quiz)" size="narrow">
    <UiEmptyState :title="loadError ? errorMessage(loadError) : t('share.quiz.unavailable')">
      <template #action>
        <UiButton variant="secondary" :to="back">{{ t('quizSelf.back') }}</UiButton>
      </template>
    </UiEmptyState>
  </UiPageContainer>
</template>
