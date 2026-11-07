import type { QuizQuestionId, QuizUnit } from '@tg-analyzer/shared'

/**
 * Words for the quiz, the same for its author and for the guest: the question («Кто чаще пишет
 * первым?») and a value in its unit (a share, a count, a time, words per message).
 */
export function useQuizText() {
  const { t, tc, formatNumber, formatPercent, formatDuration } = useI18n()

  const question = (id: QuizQuestionId) => t(`quiz.question.${id}`)

  function value(unit: QuizUnit, amount: number) {
    switch (unit) {
      case 'percent':
        return formatPercent(amount)
      case 'seconds':
        return formatDuration(amount)
      case 'words':
        return tc('quiz.words', Math.round(amount))
      default:
        return formatNumber(amount)
    }
  }

  return { question, value }
}
