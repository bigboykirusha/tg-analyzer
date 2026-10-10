<script setup lang="ts">
import type { ActivityDistributionDto, MessageCompositionDto } from '@tg-analyzer/shared'
import ChatAvatar from '../../components/ChatAvatar.vue'
import Container from '../../components/layout/Container.vue'
import EmojiGrid from '../../components/stats/EmojiGrid.vue'
import ParseProgress from '../../components/stats/ParseProgress.vue'
import Button from '../../components/ui/Button.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import MetricCard from '../../components/ui/MetricCard.vue'
import MenuItem from '../../components/ui/MenuItem.vue'
import ModalDialog from '../../components/ui/ModalDialog.vue'
import PopoverMenu from '../../components/ui/PopoverMenu.vue'
import SegmentedControl from '../../components/ui/SegmentedControl.vue'
import Skeleton from '../../components/ui/Skeleton.vue'
import { AlertCircle, ArrowLeft, BarChart2, Download, MessageSquare, RotateCw, Send, Share2 } from '../../lib/icons'
import { isApiClientError } from '../../composables/useApi'
import { useI18n } from '../../composables/useI18n'
import { useParseProgress } from '../../composables/useParseProgress'
import { useStats } from '../../composables/useStats'
import { useToast } from '../../composables/useToast'
import authMiddleware from '../../middleware/auth'
import { useAuthStore } from '../../stores/auth'
import { useStatsStore } from '../../stores/stats'

definePageMeta({
  layout: 'workspace',
  middleware: [authMiddleware],
})

const GroupReport = defineAsyncComponent(() => import('../../components/stats/GroupReport.vue'))
const ActivityHeatmap = defineAsyncComponent(() => import('../../components/stats/ActivityHeatmap.vue'))
const BalanceChart = defineAsyncComponent(() => import('../../components/stats/BalanceChart.vue'))
const CompositionChart = defineAsyncComponent(() => import('../../components/stats/CompositionChart.vue'))
const DailyVolumeChart = defineAsyncComponent(() => import('../../components/stats/DailyVolumeChart.vue'))
const HourlyChart = defineAsyncComponent(() => import('../../components/stats/HourlyChart.vue'))
const WeekdayChart = defineAsyncComponent(() => import('../../components/stats/WeekdayChart.vue'))
const ActivityDistributionCard = defineAsyncComponent(
  () => import('../../components/stats/ActivityDistributionCard.vue'),
)
const route = useRoute()
const auth = useAuthStore()
const { fetchChat } = useStats()
const { progress, bootstrapFromServer } = useParseProgress()
const stats = useStatsStore()
const { t, locale, formatNumber, formatDate: formatLocaleDate, intlLocale } = useI18n()
const toast = useToast()

const ready = ref(false)
const loadError = ref('')
const reparsing = ref(false)
const shareOpen = ref(false)
const reparseConfirmOpen = ref(false)
const activeView = ref<'overview' | 'rhythm' | 'words' | 'timeline'>('overview')
const isMobileLayout = ref(false)
const expandedChart = ref<null | 'balance' | 'composition' | 'heatmap' | 'weekday' | 'hourly' | 'daily' | 'timeline'>(
  null,
)
const reportRefreshing = ref(false)
const reportExportRef = ref<HTMLElement | null>(null)

const routeChatId = computed(() => String(route.params.id))
const chat = computed(() => stats.selectedChat)
const { downloadReportPdf, exporting, sendReportPdfToTelegramChat } = useReportExport({
  reportElement: reportExportRef,
  fileBaseName: computed(() => chat.value?.chatName || routeChatId.value),
  chatId: routeChatId,
  expandedChart,
  shareOpen,
})
const parseForCurrentChat = computed(() => progress.value.chatId === routeChatId.value)
const parseActiveForCurrentChat = computed(
  () => parseForCurrentChat.value && ['running', 'pending'].includes(progress.value.status),
)
const parseTerminalForCurrentChat = computed(
  () => parseForCurrentChat.value && ['completed', 'failed', 'cancelled'].includes(progress.value.status),
)
const reportStale = computed(() => parseActiveForCurrentChat.value || reparsing.value)
const isGroupChat = computed(() => chat.value?.chatType === 'group')
const totalMessages = computed(() => chat.value?.totalMessages ?? 0)
const directionalMessageTotal = computed(() => (chat.value?.sentMessages ?? 0) + (chat.value?.receivedMessages ?? 0))
const sentShareValue = computed(() =>
  directionalMessageTotal.value ? ((chat.value?.sentMessages ?? 0) / directionalMessageTotal.value) * 100 : 0,
)
const receivedShareValue = computed(() =>
  directionalMessageTotal.value ? ((chat.value?.receivedMessages ?? 0) / directionalMessageTotal.value) * 100 : 0,
)
const sentShare = computed(() => formatDecimal(sentShareValue.value))
const emptyComposition: MessageCompositionDto = { text: 0, media: 0, voice: 0, sticker: 0, file: 0 }
const emptyActivityDistribution: ActivityDistributionDto = {
  night: { sent: 0, received: 0, total: 0 },
  morning: { sent: 0, received: 0, total: 0 },
  afternoon: { sent: 0, received: 0, total: 0 },
  evening: { sent: 0, received: 0, total: 0 },
}
const messageComposition = computed(() => chat.value?.messageComposition ?? emptyComposition)
const overallWordsPerTextMessage = computed(() => {
  if (!chat.value || !chat.value.textMessageCount) {
    return '0.0'
  }

  return new Intl.NumberFormat(intlLocale.value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(chat.value.totalWords / chat.value.textMessageCount)
})
const peakHourNumber = computed(() => {
  const hourly = chat.value?.hourlyActivitySplit ?? {}
  const best = Object.entries(hourly)
    .filter(([hour, value]) => Number(hour) >= 0 && Number(hour) <= 23 && (value?.total ?? 0) > 0)
    .sort((left, right) => (right[1]?.total ?? 0) - (left[1]?.total ?? 0))[0]
  return best ? Number(best[0]) : null
})
const peakHour = computed(() =>
  peakHourNumber.value === null ? t('common.na') : `${String(peakHourNumber.value).padStart(2, '0')}:00`,
)
const hasWords = computed(() =>
  Boolean(chat.value?.topWordsBySender.mine.length || chat.value?.topWordsBySender.theirs.length),
)
const hasEmoji = computed(() =>
  Boolean(chat.value?.topEmojiBySender.mine.length || chat.value?.topEmojiBySender.theirs.length),
)
const topEmoji = computed(() => ({
  mine: chat.value?.topEmojiBySender.mine.slice(0, 8) ?? [],
  theirs: chat.value?.topEmojiBySender.theirs.slice(0, 8) ?? [],
}))
const distinctiveWords = computed(() => ({
  mine: chat.value?.uniqueWordsBySender.mine.slice(0, 12) ?? [],
  theirs: chat.value?.uniqueWordsBySender.theirs.slice(0, 12) ?? [],
}))
const busiestWeekdayLabel = computed(() => {
  const activity = chat.value?.weekdayActivity ?? {}
  const best = Object.entries(activity)
    .filter(([day, value]) => Number(day) >= 0 && Number(day) <= 6 && (value?.total ?? 0) > 0)
    .sort((left, right) => (right[1]?.total ?? 0) - (left[1]?.total ?? 0))[0]

  if (!best) {
    return t('common.na')
  }

  const labels = t('chart.weekdays').split(',')
  return labels[Number(best[0])] ?? t('common.na')
})
const kpiMessageSummary = computed(() =>
  t('chat.metricSentReceived', {
    sent: formatNumber(chat.value?.sentMessages ?? 0),
    received: formatNumber(chat.value?.receivedMessages ?? 0),
  }),
)
const kpiShareSummary = computed(() =>
  sentShareValue.value >= receivedShareValue.value ? t('chat.metricShareMine') : t('chat.metricShareTheirs'),
)
const kpiPeakSummary = computed(() => {
  if (peakHourNumber.value === null) return t('common.na')
  const endHour = (peakHourNumber.value + 1) % 24
  return `${peakHour.value}–${String(endHour).padStart(2, '0')}:00 · ${t('chat.metricPeakDay', { day: busiestWeekdayLabel.value.toLocaleLowerCase() })}`
})
const medianResponseSummary = computed(() => {
  const values = [chat.value?.responseStats.medianMineSec, chat.value?.responseStats.medianTheirsSec].filter(
    (value): value is number => typeof value === 'number',
  )
  if (!values.length) return t('common.na')
  return formatDurationFromSec(values.reduce((sum, value) => sum + value, 0) / values.length)
})
const totalLongSilenceDays = computed(() => {
  const totalSeconds = (chat.value?.conversationFacts.silencePeriodsOver30Days ?? []).reduce(
    (sum, gap) => sum + gap.seconds,
    0,
  )
  return Math.round(totalSeconds / 86400)
})
const trendConfidenceLabel = computed(() =>
  chat.value?.conversationFacts.trend === 'unknown' ? t('chat.confidenceLow') : t('chat.confidenceHigh'),
)
const continuousDailyActivity = computed(() => {
  return fillDailyGaps(
    chat.value?.dailyActivity ?? [],
    chat.value?.firstMessageAt ?? null,
    chat.value?.lastMessageAt ?? null,
  )
})
const reportViews = computed(() => [
  { value: 'overview' as const, label: t('chat.overview') },
  { value: 'rhythm' as const, label: t('chat.rhythm') },
  { value: 'words' as const, label: t('chat.words') },
  { value: 'timeline' as const, label: t('chat.timeline') },
])
const reparseConfirmCopy = computed(() =>
  locale.value === 'ru'
    ? {
        title: 'Обновить отчет?',
        description:
          'Запустим новый перепарсинг этого чата и заменим текущий отчет свежей аналитикой после завершения.',
        confirmLabel: 'Обновить',
      }
    : {
        title: 'Refresh this report?',
        description:
          'This will start a new parse for this chat and replace the current report with fresh analytics when it finishes.',
        confirmLabel: 'Refresh',
      },
)
const showOverview = computed(() => activeView.value === 'overview')
const showRhythm = computed(() => activeView.value === 'rhythm')
const showWords = computed(() => activeView.value === 'words')
const showTimeline = computed(() => activeView.value === 'timeline')
const reportDateRange = computed(() =>
  formatDateRange(chat.value?.firstMessageAt ?? null, chat.value?.lastMessageAt ?? null),
)
const mostActiveMonthLabel = computed(() => formatMonthValue(chat.value?.conversationFacts.mostActiveMonth ?? null))
const trendLabel = computed(() => {
  const trend = chat.value?.conversationFacts.trend ?? 'unknown'
  const labels = {
    growing: t('chat.trendGrowing'),
    stable: t('chat.trendStable'),
    fading: t('chat.trendFading'),
    unknown: t('chat.trendUnknown'),
  }

  return labels[trend]
})
const relationshipScore = computed(() => chat.value?.conversationFacts.relationshipScore ?? null)
const relationshipSummary = computed(() => {
  const stability = relationshipScore.value?.stability
  if (stability === null || stability === undefined) return t('chat.relationshipTitle')
  if (stability < 45) return t('chat.relationshipBursts')
  if (stability < 75) return t('chat.relationshipVariable')
  return t('chat.relationshipSteady')
})

function scoreTone(value: number | null, warningThreshold = 55, successThreshold = 75) {
  if (value === null) {
    return 'default'
  }

  if (value < warningThreshold) {
    return 'danger'
  }

  if (value < successThreshold) {
    return 'warning'
  }

  return 'success'
}

function metricCardToneClass(tone: string) {
  return {
    'fact-card-danger': tone === 'danger',
    'fact-card-warning': tone === 'warning',
    'fact-card-success': tone === 'success',
  }
}

const relationshipMetrics = computed(() => {
  const score = relationshipScore.value
  if (!score) {
    return []
  }

  return [
    {
      key: 'reciprocity',
      label: t('chat.relationshipReciprocity'),
      value: score.reciprocity,
      detail: t('chat.relationshipReciprocityDetail'),
      tone: scoreTone(score.reciprocity),
    },
    {
      key: 'responsiveness',
      label: t('chat.relationshipResponsiveness'),
      value: score.responsiveness,
      detail: t('chat.relationshipResponsivenessDetail'),
      tone: scoreTone(score.responsiveness),
    },
    {
      key: 'stability',
      label: t('chat.relationshipStability'),
      value: score.stability,
      detail: t('chat.relationshipStabilityDetail'),
      tone: scoreTone(score.stability),
    },
    {
      key: 'attention',
      label: t('chat.relationshipAttention'),
      value: score.attentionBalance,
      detail: t('chat.relationshipAttentionDetail'),
      tone: scoreTone(score.attentionBalance),
    },
  ]
})
const responseFacts = computed(() => {
  const stats = chat.value?.responseStats
  if (!stats) return []

  return [
    {
      key: 'rate',
      label: t('chat.responseRate'),
      value: chat.value?.responseRate == null ? t('common.na') : `${formatDecimal(chat.value.responseRate)}%`,
      sub: t('chat.responseRateDetail'),
    },
    {
      key: 'mine',
      label: t('chat.yourResponseSpread'),
      value: formatDurationFromSec(stats.medianMineSec),
      sub: responseSpreadSummary(stats.mineP25Sec, stats.mineP75Sec, stats.mineSamples),
    },
    {
      key: 'theirs',
      label: t('chat.theirResponseSpread'),
      value: formatDurationFromSec(stats.medianTheirsSec),
      sub: responseSpreadSummary(stats.theirsP25Sec, stats.theirsP75Sec, stats.theirsSamples),
    },
  ]
})
const healthScore = computed(() => chat.value?.healthScore ?? null)
const healthLabel = computed(() => {
  const label = healthScore.value?.label
  if (!label) return t('common.na')
  return {
    strong: t('chat.healthStrong'),
    steady: t('chat.healthSteady'),
    fragile: t('chat.healthFragile'),
    imbalanced: t('chat.healthImbalanced'),
  }[label]
})
const healthMetrics = computed(() => {
  const score = healthScore.value
  if (!score) return []
  return [
    { key: 'response', label: t('chat.responseRate'), value: score.responseRate },
    { key: 'fragmentation', label: t('chat.fragmentation'), value: score.fragmentation },
    { key: 'initiative', label: t('chat.initiativeBalance'), value: score.initiativeBalance },
    { key: 'stability', label: t('chat.longTermStability'), value: score.longTermStability },
  ]
})
const availabilityFacts = computed(() => {
  const value = chat.value?.availabilityProfile
  if (!value) return []
  const predictability = {
    low: t('chat.predictabilityLow'),
    medium: t('chat.predictabilityMedium'),
    high: t('chat.predictabilityHigh'),
  }[value.predictability]

  return [
    {
      key: 'hours',
      label: t('chat.activeHours'),
      value: `${formatNumber(value.activeHours)} / 24`,
      sub: `${formatDecimal(value.activeHoursPct)}% ${t('chat.ofDay')}`,
    },
    {
      key: 'predictability',
      label: t('chat.predictability'),
      value: predictability,
      sub: value.concentrationIndex === null ? t('common.na') : `${t('chat.concentrationIndex')} ×${formatDecimal(value.concentrationIndex)}`,
    },
    {
      key: 'peak',
      label: t('chat.peakWindow'),
      value: value.peakWindow ?? t('common.na'),
      sub: value.secondaryWindow
        ? t('chat.secondaryWindow', { value: value.secondaryWindow })
        : t('chat.noSecondaryWindow'),
    },
  ]
})
const sessionStats = computed(() => chat.value?.conversationFacts.sessionStats ?? null)
const densestSessionHighlight = computed(() => {
  const highlights = sessionStats.value?.highlights ?? []
  return highlights.length
    ? ([...highlights].sort((left, right) => right.totalMessages - left.totalMessages)[0] ?? null)
    : null
})
const longestSessionHighlight = computed(() => {
  const highlights = sessionStats.value?.highlights ?? []
  return highlights.length
    ? ([...highlights].sort((left, right) => right.durationSec - left.durationSec)[0] ?? null)
    : null
})
const sessionFacts = computed(() => {
  const value = sessionStats.value
  if (!value) {
    return []
  }

  return [
    {
      key: 'total',
      label: t('chat.sessionCount'),
      value: formatNumber(value.totalSessions),
      sub: t('chat.sessionCountSub'),
    },
    {
      key: 'avg-messages',
      label: t('chat.avgSessionSize'),
      value: formatNumber(value.averageSessionMessages),
      sub: t('chat.avgSessionSizeSub'),
    },
    {
      key: 'avg-duration',
      label: t('chat.avgSessionDuration'),
      value: formatDurationFromSec(value.averageSessionDurationSec),
      sub: t('chat.avgSessionDurationSub'),
    },
    {
      key: 'frequency',
      label: t('chat.sessionsPerWeek'),
      value: formatDecimal(value.sessionsPerActiveWeek),
      sub: t('chat.sessionsPerWeekSub'),
    },
    {
      key: 'peak',
      label: t('chat.sessionPeakLabel'),
      value: densestSessionHighlight.value
        ? `${formatNumber(densestSessionHighlight.value.totalMessages)} ${t('common.messages')}`
        : t('common.na'),
      sub: t('chat.sessionPeakSub'),
      tone: 'success',
    },
    {
      key: 'night-share',
      label: t('chat.nightSessions'),
      value: value.nightSessionsPct !== null ? `${value.nightSessionsPct}%` : t('common.na'),
      sub: t('chat.nightSessionsSub'),
      tone: scoreTone(value.nightSessionsPct === null ? null : 100 - value.nightSessionsPct, 45, 70),
    },
  ]
})
const shareActions = computed(() => {
  const actions: { key: string; label: string; disabled: boolean; action: () => void | Promise<void> }[] = [
    {
      key: 'telegram-direct',
      label: t('chat.sendTelegramDirect'),
      disabled: exporting.value || auth.user?.telegramSessionActive === false,
      action: sendReportPdfToTelegramChat,
    },
    { key: 'download-pdf', label: t('chat.downloadPdf'), disabled: exporting.value, action: downloadReportPdf },
  ]

  return actions
})

async function refreshReport(notify = true) {
  reportRefreshing.value = true
  loadError.value = ''

  try {
    await fetchChat(routeChatId.value)
    if (notify) {
      toast.success(t('common.refreshed'))
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('chat.loadError')
    if (notify) {
      toast.error(loadError.value)
    }
  } finally {
    reportRefreshing.value = false
  }
}

async function reparseChat() {
  if (reparsing.value || parseActiveForCurrentChat.value) return
  if (auth.user?.telegramSessionActive === false) {
    toast.warning(t('dashboard.sessionInactive'))
    return
  }

  reparsing.value = true
  try {
    await useApiEndpoint('POST /api/v1/parse/start', {
      body: { chatIds: [routeChatId.value] },
    })
    progress.value = { current: 0, total: 1, chatId: routeChatId.value, chatName: chat.value?.chatName ?? '', status: 'pending', message: '', scannedMessages: 0, startTime: Date.now() }
    await bootstrapFromServer()
    toast.success(t('chat.reparseStarted'))
  } catch (error) {
    const apiError = isApiClientError(error) ? error : null
    toast.error(apiError?.message || (error instanceof Error ? error.message : t('chat.reparseError')))
  } finally {
    reparsing.value = false
  }
}

async function confirmReparseChat() {
  reparseConfirmOpen.value = false
  await reparseChat()
}

function formatShortDate(value: string | null) {
  return formatLocaleDate(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMonthValue(value: string | null) {
  if (!value) {
    return t('common.na')
  }

  return formatLocaleDate(`${value}-01T00:00:00`, {
    month: 'long',
    year: 'numeric',
  })
}

function formatDateRange(from: string | null, to: string | null) {
  if (!from || !to) {
    return t('common.na')
  }

  return `${formatShortDate(from)} ${t('common.rangeSep')} ${formatShortDate(to)}`
}

function formatDurationFromSec(seconds?: number | null) {
  if (seconds === null || seconds === undefined || seconds < 0) {
    return t('common.na')
  }

  if (seconds < 60) {
    return t('common.lessThanMinute')
  }

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  if (days) {
    return t('common.daysHours', { days, hours })
  }

  const minutes = Math.floor(seconds / 60)
  return hours ? t('common.hoursMinutes', { hours, minutes: minutes % 60 }) : t('common.minutes', { value: minutes })
}

function responseSpreadSummary(p25: number | null, p75: number | null, samples: number) {
  const confidence =
    samples >= 20 ? t('chat.confidenceHigh') : samples >= 5 ? t('chat.confidenceMedium') : t('chat.confidenceLow')
  const sampleLabel = t('chat.responseSampleHint', { count: formatNumber(samples) })
  if (p25 === null || p75 === null) return `${sampleLabel} · ${confidence}`
  return `${formatDurationFromSec(p25)}–${formatDurationFromSec(p75)} · ${sampleLabel} · ${confidence}`
}

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return t('common.na')
  }

  return new Intl.NumberFormat(intlLocale.value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

function fillDailyGaps(
  items: Array<{ date: string; sent: number; received: number; total: number }>,
  firstMessageAt: string | null,
  lastMessageAt: string | null,
) {
  if (!items.length) {
    return items
  }

  const startDate = items[0]?.date ?? firstMessageAt?.slice(0, 10)
  const endDate = items[items.length - 1]?.date ?? lastMessageAt?.slice(0, 10)
  if (!startDate || !endDate) {
    return items
  }

  const itemMap = new Map(items.map((item) => [item.date, item]))
  const filled: typeof items = []
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    const existing = itemMap.get(date)
    filled.push(existing ?? { date, sent: 0, received: 0, total: 0 })
  }

  return filled
}

function setMobileLayout() {
  if (!import.meta.client) {
    isMobileLayout.value = false
    return
  }
  isMobileLayout.value = window.innerWidth <= 768
}

function openChart(name: typeof expandedChart.value) {
  if (!isMobileLayout.value || !name) {
    return
  }
  expandedChart.value = name
}

function closeExpandedChart() {
  expandedChart.value = null
}

async function loadInitialReport() {
  try {
    await bootstrapFromServer()
  } catch {
    // Keep report loading independent from parse status refresh.
  }

  await fetchChat(routeChatId.value)
}

watch(() => progress.value.status, (status, previous) => {
  if (status === 'idle' && (previous === 'pending' || previous === 'running')) void refreshReport(false)
})

watch(parseTerminalForCurrentChat, async (terminal, previous) => {
  if (!terminal || previous) {
    return
  }

  await refreshReport(false)
})

onMounted(async () => {
  setMobileLayout()
  if (import.meta.client) {
    window.addEventListener('resize', setMobileLayout)
  }

  try {
    await loadInitialReport()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('chat.loadError')
  } finally {
    ready.value = true
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', setMobileLayout)
  }
})
</script>

<template>
    <Container size="full">
      <div v-if="!ready" class="page-stack" aria-busy="true">
        <header class="report-header">
          <Teleport defer to="#mobile-report-toolbar" :disabled="!isMobileLayout">
          <div class="report-topline">
            <div class="toolbar-skeleton-slot">
              <Skeleton height="44px" width="44px" radius="var(--radius-full)" />
            </div>
            <div class="report-identity-main">
              <div class="report-avatar-skeleton">
                <Skeleton height="42px" width="42px" radius="999px" />
              </div>
              <div class="report-title-block">
                <Skeleton height="28px" width="56%" radius="var(--radius-md)" />
                <Skeleton height="14px" width="42%" radius="var(--radius-sm)" />
              </div>
            </div>
            <div class="toolbar-actions">
              <div v-for="item in 2" :key="item" class="toolbar-skeleton-slot">
                <Skeleton height="44px" width="44px" radius="var(--radius-full)" />
              </div>
            </div>
          </div>
          </Teleport>
          <div class="grid-kpi chat-kpi-grid">
            <div v-for="item in 4" :key="item" class="metric-skeleton-card">
              <Skeleton height="12px" width="44%" />
              <Skeleton height="30px" width="66%" />
              <Skeleton height="12px" width="75%" />
            </div>
          </div>
        </header>
        <div class="tabs-scroll no-print">
          <Skeleton height="48px" radius="var(--radius-md)" />
        </div>
        <section class="report-grid">
          <article class="card section-card">
            <div class="stack-md">
              <Skeleton height="20px" width="96px" />
              <Skeleton height="28px" width="220px" />
              <Skeleton height="14px" width="72%" />
              <div class="balance-visual">
                <Skeleton class="balance-loading-ring" height="auto" width="160px" radius="50%" />
                <div class="stack-md">
                  <Skeleton height="18px" width="80px" />
                  <Skeleton height="18px" width="80px" />
                </div>
              </div>
            </div>
          </article>
          <article class="card section-card">
            <div class="stack-md">
              <Skeleton height="20px" width="84px" />
              <Skeleton height="28px" width="200px" />
              <Skeleton height="14px" width="68%" />
              <div class="facts-grid">
                <div v-for="item in 4" :key="`fact-${item}`" class="fact-skeleton-card">
                  <Skeleton height="12px" width="40%" />
                  <Skeleton height="22px" width="58%" />
                  <Skeleton height="12px" width="74%" />
                </div>
              </div>
            </div>
          </article>
          <article class="card section-card report-span">
            <div class="stack-md">
              <Skeleton height="20px" width="120px" />
              <Skeleton height="28px" width="280px" />
              <Skeleton height="14px" width="62%" />
              <div class="score-skeleton-card">
                <Skeleton height="12px" width="42%" />
                <Skeleton height="32px" width="88px" />
                <Skeleton height="12px" width="64%" />
              </div>
              <div class="facts-grid">
                <div v-for="item in 4" :key="`relationship-${item}`" class="fact-skeleton-card">
                  <Skeleton height="12px" width="38%" />
                  <Skeleton height="22px" width="54%" />
                  <Skeleton height="12px" width="70%" />
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>

      <div v-else-if="loadError" class="page-stack animate-fade-in">
        <EmptyState :icon="AlertCircle" :title="t('chat.loadErrorTitle')" :description="loadError">
          <template #action>
            <div class="error-actions">
              <Button variant="secondary" @click="refreshReport">{{ t('common.refresh') }}</Button>
              <Button
                variant="secondary"
                class="toolbar-icon-button"
                :icon="ArrowLeft"
                icon-only
                :aria-label="t('common.back')"
                @click="navigateTo('/dashboard')"
              >
                <span class="sr-only">{{ t('common.back') }}</span>
              </Button>
            </div>
          </template>
        </EmptyState>
      </div>

      <div v-else ref="reportExportRef" class="page-stack animate-fade-in">
        <ParseProgress
          v-if="parseActiveForCurrentChat"
          :current="progress.current"
          :total="progress.total"
          :chat-name="progress.chatName"
          :status="progress.status"
          :message="progress.message"
        />

        <div v-else-if="reportStale" class="info-banner info-banner-tone">
          {{ t('chat.reportRefreshing') }}
        </div>

        <header class="report-header">
          <Teleport defer to="#mobile-report-toolbar" :disabled="!isMobileLayout">
          <div class="report-topline">
            <Button
              variant="secondary"
              class="toolbar-icon-button toolbar-back"
              :icon="ArrowLeft"
              icon-only
              :aria-label="t('common.back')"
              @click="navigateTo('/dashboard')"
            >
              <span class="sr-only">{{ t('common.back') }}</span>
            </Button>

            <div class="report-identity-main">
              <ChatAvatar
                :chat-id="chat?.tgChatId || routeChatId"
                :title="chat?.chatName || chat?.tgChatId"
                size="lg"
              />

              <div class="report-title-block">
                <h1 class="t-h1 report-title">{{ chat?.chatName || chat?.tgChatId }}</h1>
                <p class="t-small report-subtitle">{{ reportDateRange }}</p>
              </div>
            </div>

            <div class="toolbar-actions no-print">
              <Button
                class="toolbar-icon-button"
                variant="secondary"
                size="md"
                :icon="RotateCw"
                icon-only
                :loading="reparsing"
                :aria-label="t('chat.reparse')"
                :disabled="auth.user?.telegramSessionActive === false || parseActiveForCurrentChat"
                :title="auth.user?.telegramSessionActive === false ? t('dashboard.sessionInactive') : t('chat.reparse')"
                @click="reparseConfirmOpen = true"
              >
                <span class="sr-only">{{ reparsing ? t('chat.starting') : t('chat.reparse') }}</span>
              </Button>

              <PopoverMenu v-model:open="shareOpen" align="end" :aria-label="t('chat.share')">
                <template #trigger>
                  <Button
                    class="toolbar-icon-button"
                    variant="ghost"
                    size="md"
                    :icon="Share2"
                    icon-only
                    :aria-label="t('chat.share')"
                    :title="t('chat.share')"
                    @click="shareOpen = !shareOpen"
                  >
                    <span class="sr-only">{{ t('chat.share') }}</span>
                  </Button>
                </template>
                <MenuItem
                  v-for="item in shareActions"
                  :key="item.key"
                  type="button"
                  role="menuitem"
                  :disabled="item.disabled"
                  :aria-busy="item.disabled"
                  :icon="item.key === 'download-pdf' ? Download : Send"
                  @click="shareOpen = false; item.action()"
                >
                  {{ item.label }}
                </MenuItem>
              </PopoverMenu>
            </div>
          </div>
          </Teleport>
          <div v-if="!isGroupChat" class="grid-kpi chat-kpi-grid">
            <MetricCard :label="t('chat.messages')" :value="formatNumber(totalMessages)" :sub="kpiMessageSummary" />
            <MetricCard :label="t('chat.yourShare')" :value="`${sentShare}%`" :sub="kpiShareSummary" />
            <MetricCard
              :label="t('chat.wordsPerTextMsg')"
              :value="overallWordsPerTextMessage"
              :sub="t('chat.metricTextOnly')"
            />
            <MetricCard :label="t('chat.peakHour')" :value="peakHour" :sub="kpiPeakSummary" />
          </div>
        </header>

        <div v-if="!isGroupChat" class="tabs-scroll no-print">
          <SegmentedControl v-model="activeView" :options="reportViews" />
        </div>

        <GroupReport v-if="isGroupChat && chat" :chat="chat" />

        <section v-if="!isGroupChat && showOverview" id="report-section-overview" class="report-grid">
          <article class="card section-card chart-card" @click="openChart('balance')">
            <div class="section-copy">
              <span class="t-label">{{ t('chat.balance') }}</span>
              <h2 class="t-h2">{{ t('chat.sentReceived') }}</h2>
            </div>

            <div class="balance-visual">
              <div
                class="balance-donut"
                role="img"
                :aria-label="kpiMessageSummary"
                :style="{ '--sent-angle': `${sentShareValue * 3.6}deg` }"
              >
                <div class="balance-donut-center">
                  <strong>{{ Math.round(sentShareValue) }}%</strong>
                  <span>{{ t('chart.you') }}</span>
                </div>
              </div>
              <div class="balance-details">
                <div class="balance-labels">
                  <span><i class="balance-dot balance-dot-sent" />{{ t('chart.you') }}</span>
                  <strong class="t-mono">{{ formatNumber(chat?.sentMessages ?? 0) }}</strong>
                </div>
                <div class="balance-labels">
                  <span><i class="balance-dot balance-dot-received" />{{ t('chart.them') }}</span>
                  <strong class="t-mono">{{ formatNumber(chat?.receivedMessages ?? 0) }}</strong>
                </div>
                <p class="t-small section-text">
                  {{ t('chat.medianResponse', { time: medianResponseSummary }) }}
                </p>
              </div>
            </div>
          </article>

          <article class="card section-card">
            <div class="section-copy">
              <span class="t-label">{{ t('chat.relationship') }}</span>
              <h2 class="t-h2">{{ relationshipSummary }}</h2>
            </div>

            <template v-if="relationshipScore">
              <div class="relationship-metrics">
                <div
                  v-for="metric in relationshipMetrics"
                  :key="metric.key"
                  class="relationship-metric"
                >
                  <div class="relationship-metric-heading">
                    <span>{{ metric.label }}</span>
                    <strong class="t-mono">{{
                      metric.value !== null && metric.value !== undefined ? `${metric.value}%` : t('common.na')
                    }}</strong>
                  </div>
                  <div
                    class="relationship-meter"
                    :style="{ '--meter-value': `${metric.value ?? 0}%` }"
                    role="meter"
                    :aria-label="metric.label"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    :aria-valuenow="metric.value ?? 0"
                  >
                    <span />
                  </div>
                  <span class="t-small metric-explainer">{{ metric.detail }}</span>
                </div>
              </div>
            </template>

            <EmptyState
              v-else
              :icon="BarChart2"
              :title="t('chat.relationshipEmptyTitle')"
              :description="t('chat.relationshipEmptyDescription')"
            />
          </article>

          <article class="card section-card">
            <div class="section-copy">
              <span class="t-label">{{ t('chat.responseRate') }}</span>
              <h2 class="t-h2">{{ t('chat.responsePatternsTitle') }}</h2>
              <p class="t-small section-text">{{ t('chat.responsePatternsText') }}</p>
            </div>
            <div class="facts-grid response-facts-grid">
              <div v-for="fact in responseFacts" :key="fact.key" class="fact-card">
                <span class="t-label">{{ fact.label }}</span>
                <strong class="fact-value t-mono">{{ fact.value }}</strong>
                <span class="t-small metric-explainer">{{ fact.sub }}</span>
              </div>
            </div>
          </article>

          <article class="card section-card">
            <div class="section-copy">
              <span class="t-label">{{ t('chat.healthLabel') }}</span>
              <h2 v-if="healthScore" class="t-h2">{{ healthScore.score }} {{ t('chat.of100') }} · {{ healthLabel }}</h2>
              <h2 v-else class="t-h2">{{ t('chat.healthTitle') }}</h2>
              <p class="t-small section-text">{{ t('chat.healthText') }}</p>
            </div>
            <div v-if="healthScore" class="relationship-metrics">
              <div v-for="metric in healthMetrics" :key="metric.key" class="relationship-metric">
                <div class="relationship-metric-heading">
                  <span>{{ metric.label }}</span>
                  <strong class="t-mono">{{ metric.value === null ? t('common.na') : `${metric.value}%` }}</strong>
                </div>
                <div
                  class="relationship-meter"
                  :style="{ '--meter-value': `${metric.value ?? 0}%` }"
                  role="meter"
                  :aria-label="metric.label"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-valuenow="metric.value ?? 0"
                >
                  <span />
                </div>
              </div>
            </div>
            <EmptyState
              v-else
              :icon="BarChart2"
              :title="t('chat.healthEmptyTitle')"
              :description="t('chat.healthEmptyDescription')"
            />
          </article>

          <article class="card section-card report-span chart-card" @click="openChart('composition')">
            <div class="section-copy">
              <span class="t-label">{{ t('chat.messageComposition') }}</span>
              <h2 class="t-h2">{{ t('chat.compositionTitle') }}</h2>
              <p class="t-small section-text">{{ t('chat.compositionText') }}</p>
            </div>

            <CompositionChart :composition="messageComposition" />
          </article>
        </section>

        <section v-if="!isGroupChat && showRhythm" id="report-section-rhythm" class="page-stack">
          <article class="card section-card chart-card" @click="openChart('heatmap')">
            <div class="section-copy">
              <span class="t-label">{{ t('chat.heatmap') }}</span>
              <h2 class="t-h2">{{ t('chat.dailyActivity') }}</h2>
              <p class="t-small section-text">{{ t('chat.heatmapText') }}</p>
            </div>

            <ActivityHeatmap :points="continuousDailyActivity" />
          </article>

          <div class="report-grid">
            <article class="card section-card">
              <div class="section-copy">
                <span class="t-label">{{ t('chat.activityDistribution') }}</span>
                <h2 class="t-h2">{{ t('chat.activityDistributionTitle') }}</h2>
                <p class="t-small section-text">{{ t('chat.activityDistributionText') }}</p>
              </div>
              <ActivityDistributionCard
                :distribution="chat?.activityDistribution ?? emptyActivityDistribution"
              />
            </article>

            <article class="card section-card">
              <div class="section-copy">
                <span class="t-label">{{ t('chat.predictability') }}</span>
                <h2 class="t-h2">{{ t('chat.peakWindow') }}</h2>
              </div>
              <div class="facts-grid availability-facts-grid">
                <div v-for="fact in availabilityFacts" :key="fact.key" class="fact-card">
                  <span class="t-label">{{ fact.label }}</span>
                  <strong class="fact-value t-mono">{{ fact.value }}</strong>
                  <span class="t-small metric-explainer">{{ fact.sub }}</span>
                </div>
              </div>
            </article>
          </div>

          <div class="report-grid">
            <article class="card section-card chart-card" @click="openChart('weekday')">
              <div class="section-copy">
                <span class="t-label">{{ t('chat.weekdays') }}</span>
                <h2 class="t-h2">{{ t('chat.weekdayPattern') }}</h2>
                <p class="t-small section-text">{{ t('chat.weekdayTotalText') }}</p>
              </div>

              <WeekdayChart :activity="chat?.weekdayActivity ?? {}" />
            </article>

            <article class="card section-card chart-card" @click="openChart('hourly')">
              <div class="section-copy">
                <span class="t-label">{{ t('chat.hours') }}</span>
                <h2 class="t-h2">{{ t('chat.hourlySentReceived') }}</h2>
                <p class="t-small section-text">{{ t('chat.hourlyText') }}</p>
              </div>

              <HourlyChart :activity="chat?.hourlyActivitySplit ?? {}" />
            </article>
          </div>

        </section>

        <section v-if="!isGroupChat && showWords" id="report-section-words" class="page-stack">
          <EmptyState
            v-if="!hasWords && !hasEmoji"
            :icon="MessageSquare"
            :title="t('chat.noTextTitle')"
            :description="t('chat.noTextDescription')"
          />

          <template v-else>
            <div class="report-grid">
              <article class="card section-card">
                <div class="section-copy">
                  <span class="t-label">{{ t('chat.emojiLabel') }}</span>
                  <h2 class="t-h2">{{ t('chat.emojiMine') }}</h2>
                </div>

                <EmojiGrid :items="topEmoji.mine" />
              </article>

              <article class="card section-card">
                <div class="section-copy">
                  <span class="t-label">{{ t('chat.emojiLabel') }}</span>
                  <h2 class="t-h2">{{ t('chat.emojiTheirs') }}</h2>
                </div>

                <EmojiGrid :items="topEmoji.theirs" />
              </article>
            </div>

            <div class="report-grid">
              <article class="card section-card">
                <div class="section-copy">
                  <span class="t-label">{{ t('chat.distinctiveWords') }}</span>
                  <h2 class="t-h2">{{ t('chat.distinctiveMine') }}</h2>
                </div>

                <div v-if="distinctiveWords.mine.length" class="chip-wrap">
                  <span v-for="item in distinctiveWords.mine" :key="item.value" class="word-chip">
                    {{ item.value }} <span class="t-mono chip-count">{{ formatNumber(item.count) }}</span>
                  </span>
                </div>
                <EmptyState
                  v-else
                  :icon="MessageSquare"
                  :title="t('chat.distinctiveMine')"
                  :description="t('chat.noDistinctiveMine')"
                />
              </article>

              <article class="card section-card">
                <div class="section-copy">
                  <span class="t-label">{{ t('chat.distinctiveWords') }}</span>
                  <h2 class="t-h2">{{ t('chat.distinctiveTheirs') }}</h2>
                </div>

                <div v-if="distinctiveWords.theirs.length" class="chip-wrap">
                  <span v-for="item in distinctiveWords.theirs" :key="item.value" class="word-chip">
                    {{ item.value }} <span class="t-mono chip-count">{{ formatNumber(item.count) }}</span>
                  </span>
                </div>
                <EmptyState
                  v-else
                  :icon="MessageSquare"
                  :title="t('chat.distinctiveTheirs')"
                  :description="t('chat.noDistinctiveTheirs')"
                />
              </article>
            </div>
          </template>
        </section>

        <section v-if="!isGroupChat && showTimeline" id="report-section-timeline" class="page-stack">
          <article class="card section-card chart-card" @click="openChart('timeline')">
            <div class="section-copy">
              <span class="t-label">{{ t('chat.timeline') }}</span>
              <h2 class="t-h2">{{ t('chat.dailyArc') }}</h2>
              <p class="t-small section-text">{{ t('chat.dailyArcText') }}</p>
            </div>

            <DailyVolumeChart :items="continuousDailyActivity" />
          </article>

          <div class="grid-kpi timeline-kpi-grid">
            <MetricCard :label="t('chat.mostActiveMonth')" :value="mostActiveMonthLabel" />
            <MetricCard :label="t('chat.trend')" :value="trendLabel" :sub="trendConfidenceLabel" />
            <MetricCard
              :label="t('chat.silences')"
              :value="formatNumber(chat?.conversationFacts.silencePeriodsOver30Days.length ?? 0)"
            />
            <MetricCard :label="t('chat.silenceDays')" :value="formatNumber(totalLongSilenceDays)" />
          </div>

          <article class="card section-card">
            <div class="section-copy">
              <span class="t-label">{{ t('chat.sessions') }}</span>
              <h2 class="t-h2">{{ t('chat.sessionsTitle') }}</h2>
              <p class="t-small section-text">{{ t('chat.sessionsText') }}</p>
            </div>

            <div class="facts-grid">
              <div
                v-for="fact in sessionFacts"
                :key="fact.key"
                class="fact-card"
                :class="metricCardToneClass(fact.tone ?? 'default')"
              >
                <span class="t-label">{{ fact.label }}</span>
                <strong class="fact-value t-mono">{{ fact.value }}</strong>
                <span class="t-small">{{ fact.sub }}</span>
              </div>
            </div>

            <div v-if="sessionStats?.highlights.length" class="timeline-gap-grid">
              <div v-for="session in sessionStats.highlights" :key="session.startedAt" class="gap-card">
                <span class="t-label">
                  {{
                    densestSessionHighlight &&
                    session.startedAt === densestSessionHighlight.startedAt &&
                    session.endedAt === densestSessionHighlight.endedAt
                      ? t('chat.sessionWindowPeak')
                      : longestSessionHighlight &&
                          session.startedAt === longestSessionHighlight.startedAt &&
                          session.endedAt === longestSessionHighlight.endedAt
                        ? t('chat.sessionWindowLongest')
                        : t('chat.sessionWindowDefault')
                  }}
                </span>
                <strong class="gap-value t-mono"
                  >{{ formatNumber(session.totalMessages) }} {{ t('common.messages') }}</strong
                >
                <span class="t-small">{{ formatDateRange(session.startedAt, session.endedAt) }}</span>
                <span class="t-small">
                  {{ formatDurationFromSec(session.durationSec) }} · {{ formatNumber(session.sentMessages) }} /
                  {{ formatNumber(session.receivedMessages) }}
                </span>
                <span class="t-small metric-explainer">
                  {{ t('chat.sessionWindowExplainer') }}
                </span>
              </div>
            </div>
          </article>

        </section>

        <ModalDialog
          :open="Boolean(expandedChart)"
          :title="t('chat.expandChart')"
          :close-label="t('chat.closeChart')"
          size="lg"
          @close="closeExpandedChart"
        >
          <div class="chart-overlay-body">
                <BalanceChart
                  v-if="expandedChart === 'balance'"
                  :sent="chat?.sentMessages ?? 0"
                  :received="chat?.receivedMessages ?? 0"
                />
                <CompositionChart v-else-if="expandedChart === 'composition'" :composition="messageComposition" />
                <ActivityHeatmap v-else-if="expandedChart === 'heatmap'" :points="continuousDailyActivity" />
                <WeekdayChart v-else-if="expandedChart === 'weekday'" :activity="chat?.weekdayActivity ?? {}" />
                <HourlyChart v-else-if="expandedChart === 'hourly'" :activity="chat?.hourlyActivitySplit ?? {}" />
                <DailyVolumeChart v-else :items="continuousDailyActivity" />
          </div>
        </ModalDialog>

        <ConfirmDialog
          :open="reparseConfirmOpen"
          :title="reparseConfirmCopy.title"
          :description="reparseConfirmCopy.description"
          :confirm-label="reparseConfirmCopy.confirmLabel"
          :cancel-label="t('common.cancel')"
          :loading="reparsing"
          @close="reparseConfirmOpen = false"
          @confirm="confirmReparseChat"
        />
      </div>
    </Container>
</template>

<style scoped>
.page-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
}

.pdf-export-clone {
  background: var(--export-background);
}

.pdf-export-clone .no-print {
  display: none !important;
}

.pdf-export-clone .report-header {
  position: static;
  top: auto;
  backdrop-filter: none;
  background: var(--export-background);
}

.pdf-export-clone .card,
.pdf-export-clone .report-header {
  box-shadow: none;
}

.pdf-export-clone .report-header,
.pdf-export-clone .section-card,
.pdf-export-clone .report-identity-row,
.pdf-export-clone .report-highlight-item,
.pdf-export-clone .report-peek-card,
.pdf-export-clone .fact-card,
.pdf-export-clone .gap-card,
.pdf-export-clone .insight-card,
.pdf-export-clone .balance-summary-row,
.pdf-export-clone .word-chip,
.pdf-export-clone .info-banner,
.pdf-export-clone .info-banner-tone {
  background: var(--export-background) !important;
  background-image: none !important;
  border-color: var(--export-border) !important;
  color: var(--export-text) !important;
}

.pdf-export-clone .t-label,
.pdf-export-clone .t-small,
.pdf-export-clone .section-text,
.pdf-export-clone .balance-summary-label,
.pdf-export-clone .balance-summary-note,
.pdf-export-clone .report-peek-detail,
.pdf-export-clone .report-subtitle {
  color: var(--export-muted) !important;
}

.info-banner {
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-secondary);
}

.info-banner-tone {
  border-color: var(--info);
  background: var(--info-subtle);
  color: var(--info);
}

.page-toolbar,
.toolbar-actions,
.report-meta,
.title-row,
.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.page-toolbar,
.section-header {
  justify-content: space-between;
}

.stack-md,
.stack-lg {
  display: flex;
  flex-direction: column;
}

.stack-md {
  gap: var(--space-4);
}

.stack-lg {
  gap: var(--space-6);
}

.toolbar-actions,
.report-meta {
  flex-wrap: wrap;
  min-width: 0;
}

.toolbar-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex: 0 1 auto;
  margin-left: auto;
  gap: var(--space-2);
}

.toolbar-back {
  flex: 0 0 auto;
}

.toolbar-actions > * {
  flex: 0 0 auto;
}

.toolbar-skeleton-slot {
  display: inline-flex;
  flex: 0 0 auto;
}

.toolbar-actions :deep(.popover-root) {
  flex: 0 0 auto;
}

.toolbar-actions :deep(.btn) {
  min-height: 44px;
  height: 44px;
  white-space: nowrap;
}

.toolbar-icon-button {
  width: 44px;
  min-width: 44px;
  padding-inline: 0;
}

.report-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  box-shadow: none;
  backdrop-filter: none;
  min-width: 0;
}

.report-topline {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
}

.report-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  min-width: 0;
}

.report-heading-group {
  grid-template-columns: minmax(0, 1fr);
}

.report-identity-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  width: 100%;
  padding: var(--space-2) 0 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.report-identity-main {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.report-identity-main > :deep(.avatar-shell) {
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  font-size: 16px;
}

.chat-kpi-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

#report-section-overview,
#report-section-rhythm,
#report-section-words,
#report-section-timeline {
  scroll-margin-top: calc(var(--space-6) + 8px);
}

.report-title-block,
.section-card,
.section-copy {
  display: flex;
  flex-direction: column;
}

.report-title-block {
  gap: var(--space-3);
  min-width: 0;
}

.report-avatar-skeleton,
.report-highlight-skeleton {
  width: 100%;
}

.balance-loading-ring {
  aspect-ratio: 1;
  mask-image: radial-gradient(circle, transparent 49%, black 50%);
}

.metric-skeleton-card,
.peek-skeleton-card,
.fact-skeleton-card,
.score-skeleton-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
}

.metric-skeleton-card,
.peek-skeleton-card,
.fact-skeleton-card {
  padding: var(--space-4);
}

.metric-skeleton-card {
  min-height: 112px;
  justify-content: center;
}

.chat-kpi-grid > .metric-skeleton-card {
  border: 0;
  border-right: 1px solid var(--border);
  border-radius: 0;
  background: transparent;
}

.chat-kpi-grid > .metric-skeleton-card:last-child {
  border-right: 0;
}

.peek-skeleton-card {
  min-height: 92px;
}

.fact-skeleton-card {
  min-height: 112px;
}

.score-skeleton-card {
  width: 140px;
  min-height: 88px;
  padding: var(--space-3);
  justify-content: center;
}

.report-highlight-skeleton {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-2);
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-surface) 84%, transparent);
}

.section-card {
  gap: var(--space-5);
  min-width: 0;
  padding: var(--space-5);
  overflow: hidden;
  border: 1px solid var(--glass-border);
  background: var(--glass);
  box-shadow: var(--shadow);
  backdrop-filter: blur(24px) saturate(1.4);
}

.section-copy {
  gap: var(--space-1);
}

.report-title {
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: 34px;
  line-height: 1;
  letter-spacing: -0.05em;
  white-space: nowrap;
}

.report-subtitle {
  max-width: 56ch;
  color: var(--text-secondary);
}

.report-highlight-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.report-highlight-item {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
}

.report-highlight-item .t-label {
  color: var(--text-muted);
}

.report-header :deep(.metric) {
  height: 100%;
  min-height: 118px;
  border: 0;
  border-right: 1px solid var(--border);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.report-header :deep(.metric:last-child) {
  border-right: 0;
}

.report-header :deep(.metric-label),
.report-header :deep(.metric-sub) {
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-header :deep(.metric-value) {
  color: var(--text-primary);
}

.report-highlight-value {
  font-size: 16px;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.section-text {
  color: var(--text-secondary);
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
  min-width: 0;
  align-items: start;
}

.report-peek-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.report-peek-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    transform var(--transition-fast);
}

.report-peek-card:hover {
  border-color: var(--accent-border);
  background: color-mix(in srgb, var(--accent-subtle) 48%, var(--bg-elevated));
}

.report-peek-card:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-border);
}

.report-peek-card:active {
  transform: translateY(1px);
}

.report-peek-value {
  font-size: 18px;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.report-peek-detail {
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.report-span {
  grid-column: 1 / -1;
}

.facts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.response-facts-grid,
.availability-facts-grid {
  grid-template-columns: 1fr;
}

.compact-facts-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.subcard {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-elevated) 82%, transparent);
}

.fact-card,
.gap-card,
.insight-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  overflow: hidden;
}

.fact-card .t-label,
.gap-card .t-label,
.insight-card .t-label {
  color: var(--text-tertiary);
}

.insight-card {
  gap: var(--space-3);
}

.fact-card-success {
  border-color: color-mix(in srgb, var(--success) 45%, var(--border-default));
  background: color-mix(in srgb, var(--success-subtle) 72%, var(--bg-elevated));
}

.fact-card-warning {
  border-color: color-mix(in srgb, var(--warning) 45%, var(--border-default));
  background: color-mix(in srgb, var(--warning-subtle) 72%, var(--bg-elevated));
}

.fact-card-danger {
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border-default));
  background: color-mix(in srgb, var(--danger-subtle) 72%, var(--bg-elevated));
}

.fact-value,
.gap-value {
  font-size: 20px;
  color: var(--text-primary);
  overflow-wrap: anywhere;
  line-height: 1.15;
}

.metric-explainer {
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.relationship-metrics,
.relationship-metric {
  display: flex;
  flex-direction: column;
}

.relationship-metrics {
  gap: var(--space-4);
}

.relationship-metric {
  gap: var(--space-2);
}

.relationship-metric-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-primary);
}

.relationship-meter {
  height: 7px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.relationship-meter > span {
  display: block;
  width: var(--meter-value);
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}

.chart-card {
  min-width: 0;
}

.balance-visual {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-8);
}

.balance-donut {
  --sent-angle: 180deg;
  position: relative;
  display: grid;
  width: 150px;
  aspect-ratio: 1;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(var(--accent) 0 var(--sent-angle), var(--accent-2) var(--sent-angle) 360deg);
  box-shadow: inset 0 0 0 1px var(--border);
}

.balance-donut::after {
  content: '';
  position: absolute;
  inset: 22px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--glass-inset);
}

.balance-donut-center {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 2px;
}

.balance-donut-center strong {
  font-size: 28px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.balance-donut-center span {
  color: var(--text-muted);
  font-size: 12px;
}

.balance-details {
  display: grid;
  gap: var(--space-3);
}

.balance-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
}

.balance-labels span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.balance-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.balance-dot-sent {
  background: var(--accent);
}

.balance-dot-received {
  background: var(--accent-2);
}

@media (max-width: 560px) {
  .balance-visual {
    grid-template-columns: 112px minmax(0, 1fr);
    gap: var(--space-5);
  }

  .balance-donut {
    width: 112px;
  }

  .balance-donut::after {
    inset: 18px;
  }

  .balance-donut-center strong {
    font-size: 24px;
  }
}

.tabs-scroll {
  overflow-x: auto;
  width: 100%;
  padding-bottom: var(--space-1);
  scrollbar-width: none;
}

.tabs-scroll::-webkit-scrollbar {
  display: none;
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.chip-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.word-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: var(--bg-elevated);
  color: var(--text-primary);
  min-width: 0;
  overflow-wrap: anywhere;
}

.chip-count {
  color: var(--text-tertiary);
}

.timeline-gap-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.timeline-kpi-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.insights-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.insight-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.insight-head strong {
  font-size: 15px;
  line-height: 1.35;
  color: var(--text-primary);
}

.chart-overlay-body {
  min-height: 0;
}

.chart-overlay-body :deep(.chart-lg) {
  height: 420px;
}

.chart-overlay-body :deep(.chart-sm) {
  height: 360px;
}

@media (max-width: 1024px) {
  .report-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }

  .report-peek-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .report-header :deep(.metric:nth-child(even)) {
    border-right: 0;
  }

  .chat-kpi-grid > .metric-skeleton-card:nth-child(even) {
    border-right: 0;
  }

  .report-header :deep(.metric:nth-child(-n + 2)) {
    border-bottom: 1px solid var(--border);
  }

  .chat-kpi-grid > .metric-skeleton-card:nth-child(-n + 2) {
    border-bottom: 1px solid var(--border);
  }
}

@media (max-width: 768px) {
  .report-header {
    display: contents;
  }

  .report-topline {
    height: 36px;
    min-height: 36px;
  }

  .page-toolbar,
  .title-row,
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .toolbar-actions {
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: nowrap;
    margin-left: auto;
    gap: var(--space-1);
  }

  .report-header {
    gap: var(--space-4);
    padding: 0;
  }

  .report-topline {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: var(--space-3);
  }

  .report-heading {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }

  .report-title {
    font-size: 16px;
    font-weight: 700;
  }

  .section-card {
    gap: var(--space-4);
    padding: var(--space-4);
  }

  .facts-grid {
    gap: var(--space-2);
  }

  .fact-card,
  .gap-card,
  .insight-card {
    padding: var(--space-3);
  }

  .report-meta {
    gap: 6px;
  }

  .tabs-scroll {
    margin-inline: calc(var(--space-3) * -1);
    padding-inline: var(--space-3);
  }

  .report-identity-row {
    gap: var(--space-2);
    padding: var(--space-3);
  }

  .report-identity-main {
    grid-template-columns: 32px minmax(0, 1fr);
    align-items: center;
    gap: var(--space-2);
  }

  .report-identity-main > :deep(.avatar-shell) {
    width: 32px;
    height: 32px;
    font-size: 11px;
    flex: 0 0 32px;
  }

  .report-highlight-row {
    grid-template-columns: 1fr;
  }

  .report-title-block {
    flex: 1;
    min-width: 0;
  }

  .report-subtitle {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .toolbar-actions :deep(.btn),
  .toolbar-icon-button,
  .toolbar-back {
    width: 36px;
    min-width: 36px;
    height: 36px;
    min-height: 36px;
  }

  .facts-grid,
  .compact-facts-grid,
  .timeline-gap-grid {
    grid-template-columns: 1fr;
  }

  .balance-summary {
    grid-template-columns: 1fr;
  }

  .chat-kpi-grid {
    gap: 0;
  }

  .report-peek-grid {
    gap: var(--space-2);
  }

  .report-peek-card {
    padding: var(--space-3);
  }

  .metric-skeleton-card,
  .peek-skeleton-card,
  .fact-skeleton-card {
    padding: var(--space-3);
  }

  .chart-card {
    cursor: zoom-in;
  }

  .chart-overlay-body :deep(.chart-lg) {
    height: 360px;
  }

  .chart-overlay-body :deep(.chart-sm) {
    height: 320px;
  }
}

@media (max-width: 480px) {
  .page-toolbar {
    align-items: center;
    gap: var(--space-2);
  }

  .toolbar-actions {
    max-width: none;
    gap: 6px;
  }

  .toolbar-actions :deep(.btn) {
    min-height: 36px;
    height: 36px;
    min-width: 0;
    padding-inline: var(--space-3);
    font-size: 12px;
  }

  .toolbar-icon-button {
    width: 36px;
    min-width: 36px;
    padding-inline: 0;
  }

  .toolbar-back {
    width: 36px;
    min-width: 36px;
    min-height: 36px;
    height: 36px;
    padding-inline: 0;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
  }

  .report-title {
    font-size: 20px;
  }

  .report-heading {
    gap: var(--space-2);
  }

  .report-title-block {
    gap: 6px;
  }

  .section-copy .t-h2 {
    font-size: 20px;
  }

  .section-text {
    overflow-wrap: anywhere;
  }

  .fact-value,
  .gap-value {
    font-size: 18px;
  }

}

@media (max-width: 640px) {
  .chat-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 1fr;
  }

  .report-header :deep(.metric) {
    min-height: 98px;
  }

  .report-peek-grid {
    grid-template-columns: 1fr;
  }

  .timeline-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media print {
  :global(body) {
    background: var(--export-background) !important;
    color: var(--export-text) !important;
  }

  :global(.app-main) {
    padding: 0 !important;
  }

  .report-header {
    position: static;
    backdrop-filter: none;
    background: var(--export-background);
    box-shadow: none;
    border-color: var(--export-border);
  }

  .card,
  .fact-card,
  .gap-card,
  .insight-card,
  .balance-summary-row,
  .word-chip,
  .info-banner {
    background: var(--export-background) !important;
    color: var(--export-text) !important;
    border-color: var(--export-border) !important;
    box-shadow: none !important;
  }

  .section-text,
  .report-meta,
  .balance-summary-note,
  .t-small,
  .balance-summary-label {
    color: var(--export-muted) !important;
  }

  .chart-card,
  .report-grid,
  .facts-grid,
  .timeline-gap-grid {
    break-inside: avoid;
  }
}
</style>
