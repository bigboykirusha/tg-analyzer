import { ApiClientError } from './useApi'

/**
 * Refusals the service makes on purpose — a limit, a pause between analyses, a chat too small, a full queue. They
 * are not failures: one calm line says what and when, without «Не удалось запустить разбор» over it.
 */
const EXPECTED = new Set<ApiClientError['code']>([
  'CHAT_TOO_SMALL',
  'PARSE_COOLDOWN',
  'PARSE_DAILY_LIMIT',
  'PARSE_QUEUE_FULL',
  'PARSE_ALREADY_QUEUED',
  'PARSE_ALREADY_RUNNING',
])

/**
 * What can be done to a chat from anywhere (a home card's «⋯», a chat row, the new-analysis list):
 * analyse or refresh it, ask to delete its report. One shared state; the confirmation lives once in
 * the workspace layout (ReportActionsHost).
 */
export function useReportActions() {
  const { t } = useI18n()
  const workspace = useWorkspaceStore()
  const analysis = useAnalysis()
  const toast = useToast()
  const errorMessage = useErrorMessage()
  const { relogin } = useAuth()
  const starting = useState<string | null>('report-actions-starting', () => null)
  const pendingDelete = useState<string | null>('report-actions-delete', () => null)
  const deleting = useState('report-actions-deleting', () => false)
  /**
   * When a refusal said «not before…» (a pause after an analysis, the day's limit): until then the report shows the
   * wait instead of «Обновить» (18.11), so the button never leads to a refusal it already knows of. Per chat; the
   * day's limit lives in `useAnalysis().dailyLimitUntil`, `waitUntil('*')` reads it alone.
   */
  const waits = useState<Record<string, number>>('report-actions-waits', () => ({}))
  function waitUntil(chatId: string) {
    // The day's limit has one home, `dailyLimitUntil`: the status sets and clears it, a refusal sets it (19.11).
    const until = Math.max(chatId === '*' ? 0 : (waits.value[chatId] ?? 0), analysis.dailyLimitUntil.value)
    return until > Date.now() ? until : null
  }

  /** This chat is being read or waits in the queue. */
  function busy(chatId: string) {
    return (
      starting.value === chatId ||
      (analysis.isActive.value && analysis.progress.value.chatId === chatId) ||
      analysis.queued.value.some((item) => item.chatId === chatId)
    )
  }

  async function analyse(chatId: string, title: string) {
    if (busy(chatId) || starting.value) return
    starting.value = chatId
    try {
      await analysis.startAnalysis(chatId, title)
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'CHAT_TOO_SMALL') workspace.markTooSmall(chatId)
      if (
        error instanceof ApiClientError &&
        error.retryAfter &&
        ['PARSE_COOLDOWN', 'PARSE_DAILY_LIMIT'].includes(error.code)
      ) {
        const until = Date.now() + error.retryAfter * 1000
        if (error.code === 'PARSE_DAILY_LIMIT') analysis.dailyLimitUntil.value = until
        else waits.value = { ...waits.value, [chatId]: until }
      }
      if (error instanceof ApiClientError && EXPECTED.has(error.code)) toast.info(errorMessage(error))
      // The site's own session ended: the sign-in page is already on its way, a toast over it says nothing new.
      else if (error instanceof ApiClientError && error.code.startsWith('AUTH_')) return
      // Telegram ended the session: the one way on is to sign in again, so the banner offers it.
      else if (error instanceof ApiClientError && error.code === 'TELEGRAM_REAUTH_REQUIRED')
        toast.error(t('analysis.startError'), errorMessage(error), {
          label: t('common.relogin'),
          onClick: () => void relogin(),
        })
      else toast.error(t('analysis.startError'), errorMessage(error))
    } finally {
      starting.value = null
    }
  }

  function askDelete(chatId: string) {
    pendingDelete.value = chatId
  }

  async function confirmDelete() {
    const chatId = pendingDelete.value
    if (!chatId) return
    deleting.value = true
    try {
      await workspace.deleteReport(chatId)
      toast.success(t('report.deleted'))
      pendingDelete.value = null
      // Deleted from its own page: there is nothing left to look at.
      if (useRoute().path === `/chat/${chatId}`) await navigateTo('/dashboard')
    } catch (error) {
      toast.error(t('report.deleteError'), errorMessage(error))
    } finally {
      deleting.value = false
    }
  }

  return { starting, pendingDelete, deleting, busy, waitUntil, analyse, askDelete, confirmDelete }
}
