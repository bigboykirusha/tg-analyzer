/**
 * What the running analysis looks like to a person: which chat, how far («63%», «Дошли до 12 июля 2025»),
 * how much is read, roughly how long. One derivation for the capsule, the sidebar card and the sheet.
 */
const MIN_ETA_SHARE = 0.05
const MIN_ETA_MS = 5_000

export function useAnalysisView() {
  const { t, tc, formatNumber, formatCountdown, formatDate } = useI18n()
  const analysis = useAnalysis()
  const now = useNow()

  return computed(() => {
    if (!analysis.isActive.value) return null
    const { scannedMessages, totalMessages, phase, chatTitle, chatId, startedAt, waitSeconds, reachedAt } =
      analysis.progress.value
    const chat = chatTitle || t('analysis.untitledChat')
    const share = phase === 'saving' ? 1 : totalMessages ? Math.min(1, scannedMessages / totalMessages) : null
    let eta: string | null = null
    if (share && startedAt && share >= MIN_ETA_SHARE && share < 1) {
      const elapsed = now.value - startedAt
      if (elapsed >= MIN_ETA_MS)
        eta = tc('analysis.banner.eta', Math.max(1, Math.round((elapsed / share - elapsed) / 60_000)))
    }
    let status: string
    if (phase === 'waiting' && waitSeconds)
      status = t('analysis.banner.waiting', { time: formatCountdown(waitSeconds) })
    else if (phase === 'saving') status = t('analysis.banner.saving')
    else if (share === null) status = t('analysis.banner.connecting')
    else status = eta ? `${Math.round(share * 100)}%, ${eta}` : `${Math.round(share * 100)}%`
    const read = totalMessages
      ? t('analysis.banner.read', { done: formatNumber(scannedMessages), total: formatNumber(totalMessages) })
      : null
    const reached =
      reachedAt && phase === 'scanning'
        ? t('analysis.banner.reached', {
            date: formatDate(reachedAt, { day: 'numeric', month: 'long', year: 'numeric' }),
          })
        : null
    return {
      chat,
      chatId,
      title: t('analysis.banner.title', { chat }),
      status,
      read,
      reached,
      percent: share === null ? null : Math.round(share * 100),
      queued: analysis.queued.value.length,
    }
  })
}
