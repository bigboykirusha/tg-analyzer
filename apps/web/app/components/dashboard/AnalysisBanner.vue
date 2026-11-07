<script setup lang="ts">
import { Send } from '../../lib/icons'

/**
 * While an analysis runs: which chat, how far back in time the reading got («Дошли до 4 марта
 * 2025»), how many messages, roughly how long, and that the tab may be closed. The history is
 * read from today backwards, so the bar fills from its right end. Offers the bot when it is set
 * up but not on.
 */
const { t, tc, formatNumber, formatCountdown, formatDate } = useI18n()
const analysis = useAnalysis()
const auth = useAuthStore()
const now = useNow()

/** Too early to guess: the first seconds are connecting and the first pages. */
const MIN_ETA_SHARE = 0.05
const MIN_ETA_MS = 5_000

const view = computed(() => {
  if (!analysis.isActive.value) return null
  const { scannedMessages, totalMessages, phase, chatTitle, startedAt, waitSeconds, reachedAt } =
    analysis.progress.value
  const chat = chatTitle || t('analysis.untitledChat')
  const share = totalMessages ? Math.min(1, scannedMessages / totalMessages) : null
  let eta: string | null = null
  if (share && startedAt && share >= MIN_ETA_SHARE && share < 1) {
    const elapsed = now.value - startedAt
    if (elapsed >= MIN_ETA_MS) {
      const minutes = Math.max(1, Math.round((elapsed / share - elapsed) / 60_000))
      eta = tc('analysis.banner.eta', minutes)
    }
  }
  let line: string
  if (phase === 'waiting' && waitSeconds) line = t('analysis.banner.waiting', { time: formatCountdown(waitSeconds) })
  else if (phase === 'saving') line = t('analysis.banner.saving')
  else if (totalMessages)
    line = t('analysis.banner.read', { done: formatNumber(scannedMessages), total: formatNumber(totalMessages) })
  else line = t('analysis.banner.connecting')
  const reached =
    reachedAt && phase === 'scanning'
      ? t('analysis.banner.reached', {
          date: formatDate(reachedAt, { day: 'numeric', month: 'long', year: 'numeric' }),
        })
      : null
  return {
    chat,
    reached,
    line: eta ? `${line}, ${eta}` : line,
    percent: share === null ? null : Math.round(share * 100),
  }
})
const botUrl = computed(() => (auth.user?.botUrl && !auth.user.botNotify ? auth.user.botUrl : null))
</script>

<template>
  <section v-if="view" class="tile analysis-banner" aria-live="polite">
    <div class="analysis-banner__head">
      <span class="spinner analysis-banner__spinner" aria-hidden="true" />
      <strong class="t-title">{{ t('analysis.banner.title', { chat: view.chat }) }}</strong>
    </div>
    <p v-if="view.reached" class="analysis-banner__reached t-num">{{ view.reached }}</p>
    <p class="t-small t-muted t-num">{{ view.line }}</p>
    <div
      v-if="view.percent !== null"
      class="analysis-banner__bar"
      role="progressbar"
      :aria-valuenow="view.percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="t('analysis.progressLabel')"
    >
      <i :style="{ width: `${view.percent}%` }" />
    </div>
    <p class="t-small">{{ t('analysis.banner.closeTab') }}</p>
    <UiButton
      v-if="botUrl"
      variant="secondary"
      size="sm"
      :icon="Send"
      :to="botUrl"
      external
      target="_blank"
      rel="noopener"
    >
      {{ t('analysis.banner.bot') }}
    </UiButton>
  </section>
</template>

<style scoped>
.analysis-banner {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
}

.analysis-banner__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.analysis-banner__spinner {
  --spinner-size: 14px;
}

.analysis-banner__bar {
  width: 100%;
  height: var(--bar-height);
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.analysis-banner__reached {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

/* From today backwards: the filled part grows from the right end. */
.analysis-banner__bar i {
  display: block;
  margin-left: auto;
  height: 100%;
  border-radius: inherit;
  background: var(--you);
  transition: width var(--duration-slow) var(--ease-standard);
}

.analysis-banner .btn {
  margin-top: var(--space-1);
}
</style>
