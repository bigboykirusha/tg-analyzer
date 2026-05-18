<script setup lang="ts">
import type { MessageCompositionDto } from '@tg-analyzer/shared'
import AppLayout from '../../components/AppLayout.vue'
import ChatAvatar from '../../components/ChatAvatar.vue'
import Container from '../../components/layout/Container.vue'
import ActivityHeatmap from '../../components/stats/ActivityHeatmap.vue'
import BalanceChart from '../../components/stats/BalanceChart.vue'
import CompositionChart from '../../components/stats/CompositionChart.vue'
import DailyVolumeChart from '../../components/stats/DailyVolumeChart.vue'
import EmojiGrid from '../../components/stats/EmojiGrid.vue'
import HourlyChart from '../../components/stats/HourlyChart.vue'
import ParseProgress from '../../components/stats/ParseProgress.vue'
import WeekdayChart from '../../components/stats/WeekdayChart.vue'
import WordsChart from '../../components/stats/WordsChart.vue'
import Button from '../../components/ui/Button.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import MetricCard from '../../components/ui/MetricCard.vue'
import PopoverMenu from '../../components/ui/PopoverMenu.vue'
import SegmentedControl from '../../components/ui/SegmentedControl.vue'
import Skeleton from '../../components/ui/Skeleton.vue'
import { AlertCircle, BarChart2, Clock, MessageSquare } from '../../lib/icons'
import { ArrowLeft, RotateCw, Share2 } from 'lucide-vue-next'
import type { ApiClientError } from '../../composables/useApi'
import { useI18n } from '../../composables/useI18n'
import { useParseProgress } from '../../composables/useParseProgress'
import { useStats } from '../../composables/useStats'
import { useToast } from '../../composables/useToast'
import { useAuthStore } from '../../stores/auth'
import { useStatsStore } from '../../stores/stats'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const auth = useAuthStore()
const { fetchChat } = useStats()
const { progress, bootstrapped, bootstrapFromServer, connect, disconnect } = useParseProgress()
const stats = useStatsStore()
const { t, locale, formatNumber, formatDate: formatLocaleDate, formatRelative, intlLocale } = useI18n()
const toast = useToast()

const ready = ref(false)
const loadError = ref('')
const reparsing = ref(false)
const shareOpen = ref(false)
const telegramSending = ref(false)
const reparseConfirmOpen = ref(false)
const activeView = ref<'overview' | 'rhythm' | 'words' | 'timeline'>('overview')
const isMobileLayout = ref(false)
const expandedChart = ref<null | 'balance' | 'composition' | 'heatmap' | 'weekday' | 'hourly' | 'daily' | 'timeline'>(null)
const reportRefreshing = ref(false)
const reportExportRef = ref<HTMLElement | null>(null)

const routeChatId = computed(() => String(route.params.id))
const chat = computed(() => stats.selectedChat)
const parseForCurrentChat = computed(() => progress.value.chatId === routeChatId.value)
const parseActiveForCurrentChat = computed(() => parseForCurrentChat.value && ['running', 'pending'].includes(progress.value.status))
const parseTerminalForCurrentChat = computed(() => parseForCurrentChat.value && ['completed', 'failed', 'cancelled'].includes(progress.value.status))
const reportStale = computed(() => parseActiveForCurrentChat.value || reparsing.value)
const isPrivateChat = computed(() => chat.value?.chatType === 'private')
const totalMessages = computed(() => chat.value?.totalMessages ?? 0)
const sentShareValue = computed(() => totalMessages.value ? ((chat.value?.sentMessages ?? 0) / totalMessages.value) * 100 : 0)
const receivedShareValue = computed(() => Math.max(0, 100 - sentShareValue.value))
const sentShare = computed(() => formatDecimal(sentShareValue.value))
const receivedShare = computed(() => formatDecimal(receivedShareValue.value))
const balanceLeadLabel = computed(() => sentShareValue.value >= receivedShareValue.value ? t('chat.balanceYouLead') : t('chat.balanceTheyLead'))
const emptyComposition: MessageCompositionDto = { text: 0, media: 0, voice: 0, sticker: 0, file: 0 }
const messageComposition = computed(() => chat.value?.messageComposition ?? emptyComposition)
const responseMineVisible = computed(() => isPrivateChat.value && (chat.value?.responseStats.mineSamples ?? 0) >= 3)
const responseTheirsVisible = computed(() => isPrivateChat.value && (chat.value?.responseStats.theirsSamples ?? 0) >= 3)
const iWriteFirstVisible = computed(() => isPrivateChat.value && ((chat.value?.responseStats.mineSamples ?? 0) + (chat.value?.responseStats.theirsSamples ?? 0)) >= 3)
const overallWordsPerTextMessage = computed(() => {
  if (!chat.value || !chat.value.textMessageCount) {
    return '0.0'
  }

  return new Intl.NumberFormat(intlLocale.value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(chat.value.totalWords / chat.value.textMessageCount)
})
const peakHour = computed(() => {
  const hourly = chat.value?.hourlyActivitySplit ?? {}
  const entries = Object.entries(hourly)
  if (entries.length) {
    const best = [...entries].sort((left, right) => (right[1]?.total ?? 0) - (left[1]?.total ?? 0))[0]
    return best ? `${best[0].padStart(2, '0')}:00` : '--:--'
  }
  return '--:--'
})
const hasWords = computed(() => Boolean(chat.value?.topWordsBySender.mine.length || chat.value?.topWordsBySender.theirs.length))
const hasEmoji = computed(() => Boolean(chat.value?.topEmojiBySender.mine.length || chat.value?.topEmojiBySender.theirs.length))
const topWords = computed(() => ({
  mine: chat.value?.topWordsBySender.mine.slice(0, 10) ?? [],
  theirs: chat.value?.topWordsBySender.theirs.slice(0, 10) ?? [],
}))
const topEmoji = computed(() => ({
  mine: chat.value?.topEmojiBySender.mine.slice(0, 8) ?? [],
  theirs: chat.value?.topEmojiBySender.theirs.slice(0, 8) ?? [],
}))
const distinctiveWords = computed(() => ({
  mine: chat.value?.uniqueWordsBySender.mine.slice(0, 12) ?? [],
  theirs: chat.value?.uniqueWordsBySender.theirs.slice(0, 12) ?? [],
}))
const avgMessagesPerActiveDay = computed(() => {
  const activeDays = chat.value?.conversationFacts.activeDays ?? 0
  if (!activeDays || !totalMessages.value) {
    return '0.0'
  }

  return new Intl.NumberFormat(intlLocale.value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(totalMessages.value / activeDays)
})
const busiestWeekdayLabel = computed(() => {
  const activity = chat.value?.weekdayActivity ?? {}
  const best = Object.entries(activity)
    .sort((left, right) => (right[1]?.total ?? 0) - (left[1]?.total ?? 0))[0]

  if (!best) {
    return t('common.na')
  }

  const labels = t('chart.weekdays').split(',')
  return labels[Number(best[0])] ?? t('common.na')
})
const weekendShare = computed(() => {
  const activity = chat.value?.weekdayActivity ?? {}
  const weekendTotal = (activity['0']?.total ?? 0) + (activity['6']?.total ?? 0)
  if (!totalMessages.value) {
    return '0%'
  }

  return `${Math.round((weekendTotal / totalMessages.value) * 100)}%`
})
const totalLongSilenceDays = computed(() => {
  const totalSeconds = (chat.value?.conversationFacts.silencePeriodsOver30Days ?? []).reduce((sum, gap) => sum + gap.seconds, 0)
  return Math.round(totalSeconds / 86400)
})
const dailyMomentum = computed(() => {
  const points = continuousDailyActivity.value
  if (points.length < 14) {
    return 'unknown'
  }

  const totals = points.map((item) => item.total)
  const recent = totals.slice(-14).reduce((sum, value) => sum + value, 0)
  const previous = totals.slice(-28, -14).reduce((sum, value) => sum + value, 0)

  if (!recent && !previous) {
    return 'unknown'
  }
  if (recent > previous * 1.35) {
    return 'growing'
  }
  if (recent < previous * 0.65) {
    return 'fading'
  }
  return 'stable'
})
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
const reparseConfirmCopy = computed(() => locale.value === 'ru'
  ? {
      title: 'Обновить отчет?',
      description: 'Запустим новый перепарсинг этого чата и заменим текущий отчет свежей аналитикой после завершения.',
      confirmLabel: 'Обновить',
    }
  : {
      title: 'Refresh this report?',
      description: 'This will start a new parse for this chat and replace the current report with fresh analytics when it finishes.',
      confirmLabel: 'Refresh',
    })
const showAllSections = computed(() => isMobileLayout.value)
const showOverview = computed(() => showAllSections.value || activeView.value === 'overview')
const showRhythm = computed(() => showAllSections.value || activeView.value === 'rhythm')
const showWords = computed(() => showAllSections.value || activeView.value === 'words')
const showTimeline = computed(() => showAllSections.value || activeView.value === 'timeline')
const leadingWord = computed(() => topWords.value.mine[0]?.value || topWords.value.theirs[0]?.value || t('common.na'))
const reportDateRange = computed(() => formatDateRange(chat.value?.firstMessageAt ?? null, chat.value?.lastMessageAt ?? null))
const reportHeaderHighlights = computed(() => [
  {
    key: 'messages',
    label: t('chat.messages'),
    value: formatNumber(totalMessages.value),
  },
  {
    key: 'balance',
    label: t('chat.balance'),
    value: `${sentShare.value}%`,
  },
  {
    key: 'peak-hour',
    label: t('chat.peakHour'),
    value: peakHour.value,
  },
])
const reportPeekItems = computed(() => [
  {
    key: 'overview',
    view: 'overview' as const,
    label: t('chat.balance'),
    value: `${sentShare.value}%`,
    detail: balanceLeadLabel.value,
  },
  {
    key: 'rhythm',
    view: 'rhythm' as const,
    label: t('chat.peakHour'),
    value: peakHour.value,
    detail: busiestWeekdayLabel.value,
  },
  {
    key: 'words',
    view: 'words' as const,
    label: t('chat.popularWords'),
    value: leadingWord.value,
    detail: t('chat.words'),
  },
  {
    key: 'timeline',
    view: 'timeline' as const,
    label: t('chat.trend'),
    value: trendLabel.value,
    detail: mostActiveMonthLabel.value,
  },
])

const overviewFacts = computed(() => {
  const items = [
    {
      key: 'split',
      label: t('chat.sentReceivedFact'),
      value: `${formatNumber(chat.value?.sentMessages ?? 0)} / ${formatNumber(chat.value?.receivedMessages ?? 0)}`,
      sub: t('chat.messageSplit'),
      visible: true,
    },
    {
      key: 'mine-response',
      label: t('chat.yourMedianResponse'),
      value: formatDurationFromSec(chat.value?.medianMyResponseSec),
      sub: t('chat.responseSampleHint', { count: formatNumber(chat.value?.responseStats.mineSamples ?? 0) }),
      visible: responseMineVisible.value,
    },
    {
      key: 'their-response',
      label: t('chat.theirMedianResponse'),
      value: formatDurationFromSec(chat.value?.medianTheirResponseSec),
      sub: t('chat.responseSampleHint', { count: formatNumber(chat.value?.responseStats.theirsSamples ?? 0) }),
      visible: responseTheirsVisible.value,
    },
    {
      key: 'first-write',
      label: t('chat.iWriteFirst'),
      value: chat.value?.iWriteFirstPct !== null && chat.value?.iWriteFirstPct !== undefined
        ? `${chat.value.iWriteFirstPct}%`
        : t('common.na'),
      sub: t('chat.afterLongGaps'),
      visible: iWriteFirstVisible.value,
    },
    {
      key: 'words',
      label: isPrivateChat.value ? t('chat.wordsPerTextMsg') : t('chat.averageWords'),
      value: isPrivateChat.value
        ? `${formatDecimal(chat.value?.wordsPerMessage.mine)} / ${formatDecimal(chat.value?.wordsPerMessage.theirs)}`
        : overallWordsPerTextMessage.value,
      sub: isPrivateChat.value ? t('chat.youThem') : t('chat.textMessagesOnly'),
      visible: true,
    },
    {
      key: 'silence',
      label: t('chat.longestSilence'),
      value: formatDurationFromSec(chat.value?.conversationFacts.longestGap?.seconds),
      sub: formatDateRange(chat.value?.conversationFacts.longestGap?.from ?? null, chat.value?.conversationFacts.longestGap?.to ?? null),
      visible: true,
    },
    {
      key: 'active-day',
      label: t('chat.mostActiveDay'),
      value: formatShortDate(chat.value?.conversationFacts.mostActiveDate?.date ?? null),
      sub: `${formatNumber(chat.value?.conversationFacts.mostActiveDate?.total ?? 0)} ${t('common.messages')}`,
      visible: true,
    },
    {
      key: 'active-days',
      label: t('chat.activeDays'),
      value: formatNumber(chat.value?.conversationFacts.activeDays ?? 0),
      sub: t('chat.activeDaysSub'),
      visible: true,
    },
    {
      key: 'streak',
      label: t('chat.maxStreak'),
      value: formatNumber(chat.value?.conversationFacts.maxStreakDays ?? 0),
      sub: t('chat.streakDaysSub'),
      visible: true,
    },
    {
      key: 'active-day-volume',
      label: t('chat.avgActiveDayVolume'),
      value: avgMessagesPerActiveDay.value,
      sub: t('chat.avgActiveDayVolumeSub'),
      visible: true,
    },
    {
      key: 'weekday',
      label: t('chat.busiestWeekday'),
      value: busiestWeekdayLabel.value,
      sub: t('chat.busiestWeekdaySub'),
      visible: true,
    },
    {
      key: 'weekend',
      label: t('chat.weekendShare'),
      value: weekendShare.value,
      sub: t('chat.weekendShareSub'),
      visible: true,
    },
  ]

  return items.filter((item) => item.visible)
})

const mostActiveMonthLabel = computed(() => formatMonthValue(chat.value?.conversationFacts.mostActiveMonth ?? null))
const trendLabel = computed(() => {
  const trend = dailyMomentum.value
  const labels = {
    growing: t('chat.trendGrowing'),
    stable: t('chat.trendStable'),
    fading: t('chat.trendFading'),
    unknown: t('chat.trendUnknown'),
  }

  return labels[trend]
})
const relationshipScore = computed(() => chat.value?.conversationFacts.relationshipScore ?? null)
const relationshipLabel = computed(() => {
  const label = relationshipScore.value?.label
  if (!label) {
    return t('common.na')
  }

  const labels = {
    balanced: t('chat.relationshipBalanced'),
    warm: t('chat.relationshipWarm'),
    cooling: t('chat.relationshipCooling'),
    one_sided: t('chat.relationshipOneSided'),
    emerging: t('chat.relationshipEmerging'),
  }

  return labels[label]
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
const sessionStats = computed(() => chat.value?.conversationFacts.sessionStats ?? null)
const densestSessionHighlight = computed(() => {
  const highlights = sessionStats.value?.highlights ?? []
  return highlights.length
    ? [...highlights].sort((left, right) => right.totalMessages - left.totalMessages)[0] ?? null
    : null
})
const longestSessionHighlight = computed(() => {
  const highlights = sessionStats.value?.highlights ?? []
  return highlights.length
    ? [...highlights].sort((left, right) => right.durationSec - left.durationSec)[0] ?? null
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
const insightItems = computed(() => {
  const items = chat.value?.conversationFacts.insights ?? []

  return items.map((item) => {
    if (item.key === 'session-intensity' && sessionStats.value) {
      return {
        ...item,
        title: t('chat.insightSessionIntensityTitle'),
        description: t('chat.insightSessionIntensityDescription', {
          sessions: formatNumber(sessionStats.value.totalSessions),
          average: formatNumber(sessionStats.value.averageSessionMessages),
        }),
      }
    }

    if (item.key === 'long-session' && sessionStats.value?.longestSessionDurationSec) {
      const longestSession = longestSessionHighlight.value
      return {
        ...item,
        title: t('chat.insightLongSessionExtendedTitle'),
        description: longestSession
          ? t('chat.insightLongSessionExtendedDescription', {
              duration: formatDurationFromSec(longestSession.durationSec),
              messages: formatNumber(longestSession.totalMessages),
            })
          : item.description,
      }
    }

    if (item.key === 'trend-growing') {
      return {
        ...item,
        title: t('chat.insightTrendGrowingTitle'),
        description: t('chat.insightTrendGrowingDescription'),
      }
    }

    if (item.key === 'trend-fading') {
      return {
        ...item,
        title: t('chat.insightTrendFadingTitle'),
        description: t('chat.insightTrendFadingDescription'),
      }
    }

    if (item.key === 'long-gap' && chat.value?.conversationFacts.longestGap?.seconds) {
      return {
        ...item,
        title: t('chat.insightLongGapTitle'),
        description: t('chat.insightLongGapDescription', {
          days: formatNumber(Math.round(chat.value.conversationFacts.longestGap.seconds / 86400)),
        }),
      }
    }

    if (item.key === 'relationship-score' && relationshipScore.value) {
      return {
        ...item,
        title: t('chat.insightRelationshipScoreTitle'),
        description: t('chat.insightRelationshipScoreDescription', {
          score: formatNumber(relationshipScore.value.score),
          label: relationshipLabel.value.toLowerCase(),
        }),
      }
    }

    if (item.key === 'response-asymmetry') {
      const responseStats = chat.value?.responseStats
      const myMedian = responseStats?.medianMineSec
      const theirMedian = responseStats?.medianTheirsSec
      if (myMedian !== null && myMedian !== undefined && theirMedian !== null && theirMedian !== undefined) {
        const slowerSide = myMedian > theirMedian ? t('chat.insightYou') : t('chat.insightContact')
        const gapHours = Math.abs(myMedian - theirMedian) / 3600
        return {
          ...item,
          title: t('chat.insightResponseAsymmetryTitle'),
          description: t('chat.insightResponseAsymmetryDescription', {
            side: slowerSide,
            hours: gapHours.toFixed(1),
          }),
        }
      }
    }

    return item
  })
})
const shareActions = computed(() => {
  const actions: { key: string; label: string; action: () => void | Promise<void> }[] = [
    { key: 'telegram-direct', label: t('chat.sendTelegramDirect'), action: sendReportPdfToTelegramChat },
    { key: 'download-pdf', label: t('chat.downloadPdf'), action: downloadReportPdf },
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
  if (auth.user?.telegramSessionActive === false) {
    toast.warning(t('dashboard.sessionInactive'))
    return
  }

  reparsing.value = true
  try {
    await useApiFetch('/api/parse/start', {
      method: 'POST',
      body: { chatIds: [routeChatId.value] },
    })
    await bootstrapFromServer()
    toast.success(t('chat.reparseStarted'))
  } catch (error) {
    const apiError = error as ApiClientError
    toast.error(apiError.message || t('chat.reparseError'))
  } finally {
    reparsing.value = false
  }
}

async function confirmReparseChat() {
  reparseConfirmOpen.value = false
  await reparseChat()
}

function buildSafeExportName() {
  return ((chat.value?.chatName || routeChatId.value)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)) || 'telegram-chat'
}

function downloadFile(file: File) {
  if (!import.meta.client) {
    return
  }

  try {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    document.body.append(link)
    link.click()
    window.setTimeout(() => {
      link.remove()
      URL.revokeObjectURL(url)
    }, 1000)
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
}

async function createReportPdfFile() {
  if (!import.meta.client) {
    throw new Error('Client-only action')
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  expandedChart.value = null
  shareOpen.value = false
  await nextTick()

  let exportRoot: HTMLElement | null = null
  try {
    const target = reportExportRef.value
    if (!target) {
      throw new Error('Report content is unavailable')
    }

    exportRoot = target.cloneNode(true) as HTMLElement
    exportRoot.classList.add('pdf-export-clone')
    exportRoot.querySelectorAll('.no-print, .dialog-backdrop, .chart-overlay').forEach((node) => node.remove())
    Object.assign(exportRoot.style, {
      position: 'fixed',
      left: '-20000px',
      top: '0',
      width: `${Math.ceil(target.scrollWidth)}px`,
      maxWidth: 'none',
      minWidth: `${Math.ceil(target.scrollWidth)}px`,
      background: '#ffffff',
      zIndex: '-1',
      pointerEvents: 'none',
      overflow: 'visible',
    })
    document.body.append(exportRoot)

    const exportWidth = Math.ceil(exportRoot.scrollWidth)
    const exportHeight = Math.ceil(exportRoot.scrollHeight)

    const canvas = await html2canvas(exportRoot, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width: exportWidth,
      height: exportHeight,
      windowWidth: exportWidth,
      windowHeight: exportHeight,
      scrollX: 0,
      scrollY: 0,
    })

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4',
      compress: true,
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const pageHeightPx = Math.floor((canvas.width * pageHeight) / pageWidth)
    const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx))

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
      if (pageIndex > 0) {
        pdf.addPage()
      }

      const sliceTop = pageIndex * pageHeightPx
      const sliceHeight = Math.min(pageHeightPx, canvas.height - sliceTop)
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sliceHeight

      const pageContext = pageCanvas.getContext('2d')
      if (!pageContext) {
        throw new Error('Canvas is unavailable')
      }

      pageContext.fillStyle = '#ffffff'
      pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      pageContext.drawImage(
        canvas,
        0,
        sliceTop,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      )

      const pageImageHeight = (sliceHeight * pageWidth) / canvas.width
      const pageImage = pageCanvas.toDataURL('image/jpeg', 0.92)

      pdf.addImage(
        pageImage,
        'JPEG',
        0,
        0,
        pageWidth,
        pageImageHeight,
        undefined,
        'FAST',
      )
    }

    const blob = pdf.output('blob')
    return new File([blob], `${buildSafeExportName()}-report.pdf`, { type: 'application/pdf' })
  } finally {
    exportRoot?.remove()
  }
}

async function downloadReportPdf() {
  try {
    const file = await createReportPdfFile()
    downloadFile(file)
    toast.success(t('chat.pdfReady'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('chat.pdfReady'))
  }
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

async function sendReportPdfToTelegramChat() {
  if (auth.user?.telegramSessionActive === false) {
    toast.warning(t('dashboard.sessionInactive'))
    return
  }

  telegramSending.value = true

  try {
    const file = await createReportPdfFile()
    const base64 = await fileToBase64(file)

    await useApiFetch('/api/parse/share-report', {
      method: 'POST',
      body: {
        chatId: routeChatId.value,
        fileName: file.name,
        mimeType: file.type,
        base64,
      },
    })

    shareOpen.value = false
    toast.success(t('chat.sentToTelegram'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('chat.sentToTelegram'))
  } finally {
    telegramSending.value = false
  }
}

function formatDate(value: string | null) {
  return formatLocaleDate(value)
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
  if (!seconds) {
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
  return hours
    ? t('common.hoursMinutes', { hours, minutes: minutes % 60 })
    : t('common.minutes', { value: minutes })
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

function fillDailyGaps(items: Array<{ date: string; sent: number; received: number; total: number }>, firstMessageAt: string | null, lastMessageAt: string | null) {
  if (!items.length) {
    return items
  }

  const startDate = firstMessageAt?.slice(0, 10) ?? items[0]?.date
  const endDate = lastMessageAt?.slice(0, 10) ?? items[items.length - 1]?.date
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

async function focusReportSection(view: 'overview' | 'rhythm' | 'words' | 'timeline') {
  activeView.value = view
  await nextTick()

  if (!import.meta.client) {
    return
  }

  const target = document.getElementById(`report-section-${view}`)
  target?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
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

watch(parseActiveForCurrentChat, (active) => {
  if (!bootstrapped.value) {
    return
  }

  if (active) {
    connect()
    return
  }

  disconnect()
})

watch(parseTerminalForCurrentChat, async (terminal, previous) => {
  if (!terminal || previous) {
    return
  }

  disconnect()
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
  disconnect()
})
</script>

<template>
  <AppLayout>
    <Container size="default">
    <div v-if="!ready" class="page-stack">
      <section class="card section-card">
        <div class="stack-md">
          <div class="page-toolbar page-toolbar-skeleton no-print">
            <div class="toolbar-skeleton-slot">
              <Skeleton height="34px" width="34px" radius="var(--radius-md)" />
            </div>
            <div class="toolbar-actions">
              <div class="toolbar-skeleton-slot">
                <Skeleton height="34px" width="34px" radius="var(--radius-md)" />
              </div>
              <div class="toolbar-skeleton-slot">
                <Skeleton height="34px" width="34px" radius="var(--radius-md)" />
              </div>
            </div>
          </div>
          <div class="report-heading">
            <div class="report-identity-row">
              <div class="report-identity-main">
                <div class="report-avatar-skeleton">
                  <Skeleton height="48px" width="48px" radius="999px" />
                </div>
                <div class="report-title-block">
                  <Skeleton height="28px" width="56%" radius="var(--radius-md)" />
                  <Skeleton height="14px" width="42%" radius="var(--radius-sm)" />
                </div>
              </div>
              <div class="report-highlight-row">
                <div v-for="item in 3" :key="`heading-highlight-${item}`" class="report-highlight-skeleton">
                  <Skeleton height="58px" radius="var(--radius-sm)" />
                </div>
              </div>
            </div>
            <div class="report-meta-list report-skeleton-meta">
              <div v-for="item in 3" :key="`heading-meta-${item}`" class="report-meta-skeleton">
                <Skeleton height="52px" radius="var(--radius-sm)" />
              </div>
            </div>
          </div>
          <div class="grid-kpi chat-kpi-grid">
            <Skeleton v-for="item in 4" :key="item" height="112px" radius="var(--radius-md)" />
          </div>
          <div class="report-peek-grid no-print">
            <Skeleton v-for="item in 4" :key="`peek-${item}`" height="92px" radius="var(--radius-md)" />
          </div>
        </div>
      </section>
      <div v-if="!showAllSections" class="tabs-scroll no-print">
        <Skeleton height="48px" radius="var(--radius-md)" />
      </div>
      <section class="report-grid">
        <article class="card section-card">
          <div class="stack-md">
            <Skeleton height="20px" width="96px" />
            <Skeleton height="28px" width="220px" />
            <Skeleton height="14px" width="72%" />
            <Skeleton height="220px" radius="var(--radius-md)" />
            <div class="balance-summary">
              <Skeleton v-for="item in 2" :key="`balance-${item}`" height="86px" radius="var(--radius-md)" />
            </div>
          </div>
        </article>
        <article class="card section-card">
          <div class="stack-md">
            <Skeleton height="20px" width="84px" />
            <Skeleton height="28px" width="200px" />
            <Skeleton height="14px" width="68%" />
            <div class="facts-grid">
              <Skeleton v-for="item in 4" :key="`fact-${item}`" height="112px" radius="var(--radius-md)" />
            </div>
          </div>
        </article>
        <article class="card section-card report-span">
          <div class="stack-md">
            <Skeleton height="20px" width="120px" />
            <Skeleton height="28px" width="280px" />
            <Skeleton height="14px" width="62%" />
            <Skeleton height="88px" width="140px" radius="var(--radius-md)" />
            <div class="facts-grid">
              <Skeleton v-for="item in 4" :key="`relationship-${item}`" height="108px" radius="var(--radius-md)" />
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
            <Button variant="ghost" @click="navigateTo('/dashboard')">{{ t('common.back') }}</Button>
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
        <div class="page-toolbar no-print">
          <Button variant="ghost" class="toolbar-back" :icon="ArrowLeft" @click="navigateTo('/dashboard')">
            <span class="toolbar-back-label">{{ t('common.back') }}</span>
          </Button>

          <div class="toolbar-actions">
            <Button
              class="toolbar-icon-button"
              variant="secondary"
              size="md"
              :icon="RotateCw"
              :loading="reparsing"
              :aria-label="t('chat.reparse')"
              :disabled="auth.user?.telegramSessionActive === false || parseActiveForCurrentChat"
              :title="auth.user?.telegramSessionActive === false ? t('dashboard.sessionInactive') : t('chat.reparse')"
              @click="reparseConfirmOpen = true"
            >
              <span class="screen-reader">{{ reparsing ? t('chat.starting') : t('chat.reparse') }}</span>
            </Button>

            <Button
              v-if="isMobileLayout"
              class="toolbar-icon-button"
              variant="ghost"
              size="md"
              :icon="Share2"
              :aria-label="t('chat.share')"
              :title="t('chat.share')"
              @click="shareOpen = true"
            >
              <span class="screen-reader">{{ t('chat.share') }}</span>
            </Button>
            <PopoverMenu v-else v-model:open="shareOpen" align="end">
              <template #trigger>
                <Button
                  class="toolbar-icon-button"
                  variant="ghost"
                  size="md"
                  :icon="Share2"
                  :aria-label="t('chat.share')"
                  :title="t('chat.share')"
                  @click="shareOpen = !shareOpen"
                >
                  <span class="screen-reader">{{ t('chat.share') }}</span>
                </Button>
              </template>
              <button v-for="item in shareActions" :key="item.key" type="button" class="share-option"
                @click="item.action">
                {{ item.label }}
              </button>
            </PopoverMenu>
          </div>
        </div>

        <div class="report-heading">
          <div class="report-identity-row">
            <div class="report-identity-main">
              <ChatAvatar :chat-id="chat?.tgChatId || routeChatId" :title="chat?.chatName || chat?.tgChatId" size="lg" />

              <div class="report-title-block">
                <h1 class="text-h1 report-title">{{ chat?.chatName || chat?.tgChatId }}</h1>
                <p class="text-body-sm report-subtitle">{{ reportDateRange }}</p>
              </div>
            </div>

            <div class="report-highlight-row">
              <div v-for="item in reportHeaderHighlights" :key="item.key" class="report-highlight-item">
                <span class="text-label">{{ item.label }}</span>
                <strong class="mono-value report-highlight-value">{{ item.value }}</strong>
              </div>
            </div>
          </div>

          <div class="report-meta-list text-body-sm">
            <div class="report-meta-row">
              <span class="report-meta-label">{{ t('chat.firstMsg') }}:</span>
              <span class="mono-value report-meta-value">{{ formatDate(chat?.firstMessageAt ?? null) }}</span>
            </div>
            <div class="report-meta-row">
              <span class="report-meta-label">{{ t('chat.last') }}:</span>
              <span class="mono-value report-meta-value">{{ formatDate(chat?.lastMessageAt ?? null) }}</span>
            </div>
            <span v-if="reportStale" class="stale-indicator mono-value">{{ t('chat.refreshing') }}</span>
          </div>
        </div>

        <div class="grid-kpi chat-kpi-grid">
          <MetricCard :label="t('chat.messages')" :value="formatNumber(totalMessages)" />
          <MetricCard :label="t('chat.yourShare')" :value="`${sentShare}%`" />
          <MetricCard :label="t('chat.wordsPerTextMsg')" :value="overallWordsPerTextMessage" />
          <MetricCard :label="t('chat.peakHour')" :value="peakHour" :sub="t('chat.peakHourSub')" />
        </div>

        <div class="report-peek-grid no-print">
          <button
            v-for="item in reportPeekItems"
            :key="item.key"
            type="button"
            class="report-peek-card"
            @click="focusReportSection(item.view)"
          >
            <span class="text-label">{{ item.label }}</span>
            <strong class="mono-value report-peek-value">{{ item.value }}</strong>
            <span class="text-caption report-peek-detail">{{ item.detail }}</span>
          </button>
        </div>
      </header>

      <div v-if="!showAllSections" class="tabs-scroll no-print">
        <SegmentedControl v-model="activeView" :options="reportViews" />
      </div>

      <section v-if="showOverview" id="report-section-overview" class="report-grid">
        <article class="card section-card chart-card" @click="openChart('balance')">
          <div class="section-copy">
            <span class="text-label">{{ t('chat.balance') }}</span>
            <h2 class="text-h2">{{ t('chat.sentReceived') }}</h2>
            <p class="text-body-sm section-text">{{ t('chat.balanceText') }}</p>
          </div>

          <BalanceChart :sent="chat?.sentMessages ?? 0" :received="chat?.receivedMessages ?? 0" />

          <div class="balance-summary">
            <div class="balance-summary-row">
              <span class="balance-summary-label">{{ t('dashboard.sent') }}</span>
              <strong class="mono-value">{{ formatNumber(chat?.sentMessages ?? 0) }}</strong>
              <span class="balance-summary-share mono-value">{{ sentShare }}%</span>
            </div>
            <div class="balance-summary-row">
              <span class="balance-summary-label">{{ t('dashboard.recv') }}</span>
              <strong class="mono-value">{{ formatNumber(chat?.receivedMessages ?? 0) }}</strong>
              <span class="balance-summary-share mono-value">{{ receivedShare }}%</span>
            </div>
            <div class="balance-summary-note text-body-sm">
              {{ t('chat.balanceLead') }} <span class="mono-value">{{ balanceLeadLabel }}</span>
            </div>
          </div>
        </article>

        <article class="card section-card">
          <div class="section-copy">
            <span class="text-label">{{ t('chat.facts') }}</span>
            <h2 class="text-h2">{{ t('chat.snapshot') }}</h2>
            <p class="text-body-sm section-text">{{ t('chat.snapshotText') }}</p>
          </div>

          <div class="facts-grid">
            <div v-for="(fact, index) in overviewFacts" :key="fact.key" class="fact-card stagger-item"
              :style="{ '--delay': `${index * 40}ms` }">
              <span class="text-label">{{ fact.label }}</span>
              <strong class="fact-value mono-value">{{ fact.value }}</strong>
              <span class="text-caption">{{ fact.sub }}</span>
            </div>
          </div>
        </article>

        <article class="card section-card report-span">
          <div class="section-copy">
            <span class="text-label">{{ t('chat.relationship') }}</span>
            <h2 class="text-h2">{{ t('chat.relationshipTitle') }}</h2>
            <p class="text-body-sm section-text">{{ t('chat.relationshipText') }}</p>
          </div>

          <template v-if="relationshipScore">
            <div class="relationship-score">
              <strong class="mono-value relationship-score-value">{{ relationshipScore.score }}/100</strong>
              <span class="text-body-sm">{{ relationshipLabel }}</span>
            </div>

            <div class="facts-grid">
              <div v-for="metric in relationshipMetrics" :key="metric.key" class="fact-card"
                :class="metricCardToneClass(metric.tone)">
                <span class="text-label">{{ metric.label }}</span>
                <strong class="fact-value mono-value">{{ metric.value !== null ? `${metric.value}%` : t('common.na') }}</strong>
                <span class="text-caption metric-explainer">{{ metric.detail }}</span>
              </div>
            </div>
          </template>

          <EmptyState v-else :icon="BarChart2" :title="t('chat.relationshipEmptyTitle')" :description="t('chat.relationshipEmptyDescription')" />
        </article>

        <article class="card section-card report-span chart-card" @click="openChart('composition')">
          <div class="section-copy">
            <span class="text-label">{{ t('chat.messageComposition') }}</span>
            <h2 class="text-h2">{{ t('chat.compositionTitle') }}</h2>
            <p class="text-body-sm section-text">{{ t('chat.compositionText') }}</p>
          </div>

          <CompositionChart :composition="messageComposition" />
        </article>
      </section>

      <section v-if="showRhythm" id="report-section-rhythm" class="page-stack">
        <article class="card section-card chart-card" @click="openChart('heatmap')">
          <div class="section-copy">
            <span class="text-label">{{ t('chat.heatmap') }}</span>
            <h2 class="text-h2">{{ t('chat.dailyActivity') }}</h2>
            <p class="text-body-sm section-text">{{ t('chat.heatmapText') }}</p>
          </div>

          <ActivityHeatmap :points="continuousDailyActivity" />
        </article>

        <div class="report-grid">
          <article class="card section-card chart-card" @click="openChart('weekday')">
            <div class="section-copy">
              <span class="text-label">{{ t('chat.weekdays') }}</span>
              <h2 class="text-h2">{{ t('chat.weekdayPattern') }}</h2>
              <p class="text-body-sm section-text">{{ t('chat.weekdayTotalText') }}</p>
            </div>

            <WeekdayChart :activity="chat?.weekdayActivity ?? {}" />
          </article>

          <article class="card section-card chart-card" @click="openChart('hourly')">
            <div class="section-copy">
              <span class="text-label">{{ t('chat.hours') }}</span>
              <h2 class="text-h2">{{ t('chat.hourlySentReceived') }}</h2>
              <p class="text-body-sm section-text">{{ t('chat.hourlyText') }}</p>
            </div>

            <HourlyChart :activity="chat?.hourlyActivitySplit ?? {}" />
          </article>
        </div>

        <article class="card section-card chart-card" @click="openChart('daily')">
          <div class="section-copy">
            <span class="text-label">{{ t('chat.dailyDynamics') }}</span>
            <h2 class="text-h2">{{ t('chat.dailyDynamics') }}</h2>
            <p class="text-body-sm section-text">{{ t('chat.dailyArcText') }}</p>
          </div>

          <DailyVolumeChart :items="continuousDailyActivity" />
        </article>
      </section>

      <section v-if="showWords" id="report-section-words" class="page-stack">
        <EmptyState v-if="!hasWords && !hasEmoji" :icon="MessageSquare" :title="t('chat.noTextTitle')"
          :description="t('chat.noTextDescription')" />

        <template v-else>
          <article class="card section-card">
            <div class="section-copy">
              <span class="text-label">{{ t('chat.words') }}</span>
              <h2 class="text-h2">{{ t('chat.popularWords') }}</h2>
              <p class="text-body-sm section-text">{{ t('chat.wordsText') }}</p>
            </div>

            <WordsChart v-if="hasWords" :mine="topWords.mine" :theirs="topWords.theirs" />
            <EmptyState v-else :icon="MessageSquare" :title="t('chat.noWordsTitle')" :description="t('chat.noWordsDescription')" />
          </article>

          <div class="report-grid">
            <article class="card section-card">
              <div class="section-copy">
                <span class="text-label">{{ t('chat.emojiLabel') }}</span>
                <h2 class="text-h2">{{ t('chat.emojiMine') }}</h2>
              </div>

              <EmojiGrid :items="topEmoji.mine" />
            </article>

            <article class="card section-card">
              <div class="section-copy">
                <span class="text-label">{{ t('chat.emojiLabel') }}</span>
                <h2 class="text-h2">{{ t('chat.emojiTheirs') }}</h2>
              </div>

              <EmojiGrid :items="topEmoji.theirs" />
            </article>
          </div>

          <div class="report-grid">
            <article class="card section-card">
              <div class="section-copy">
                <span class="text-label">{{ t('chat.distinctiveWords') }}</span>
                <h2 class="text-h2">{{ t('chat.distinctiveMine') }}</h2>
              </div>

              <div v-if="distinctiveWords.mine.length" class="chip-wrap">
                <span v-for="item in distinctiveWords.mine" :key="item.value" class="word-chip">
                  {{ item.value }} <span class="mono-value chip-count">{{ formatNumber(item.count) }}</span>
                </span>
              </div>
              <EmptyState v-else :icon="MessageSquare" :title="t('chat.distinctiveMine')" :description="t('chat.noDistinctiveMine')" />
            </article>

            <article class="card section-card">
              <div class="section-copy">
                <span class="text-label">{{ t('chat.distinctiveWords') }}</span>
                <h2 class="text-h2">{{ t('chat.distinctiveTheirs') }}</h2>
              </div>

              <div v-if="distinctiveWords.theirs.length" class="chip-wrap">
                <span v-for="item in distinctiveWords.theirs" :key="item.value" class="word-chip">
                  {{ item.value }} <span class="mono-value chip-count">{{ formatNumber(item.count) }}</span>
                </span>
              </div>
              <EmptyState v-else :icon="MessageSquare" :title="t('chat.distinctiveTheirs')" :description="t('chat.noDistinctiveTheirs')" />
            </article>
          </div>
        </template>
      </section>

      <section v-if="showTimeline" id="report-section-timeline" class="page-stack">
        <article class="card section-card chart-card" @click="openChart('timeline')">
          <div class="section-copy">
            <span class="text-label">{{ t('chat.timeline') }}</span>
            <h2 class="text-h2">{{ t('chat.dailyArc') }}</h2>
            <p class="text-body-sm section-text">{{ t('chat.dailyArcText') }}</p>
          </div>

          <DailyVolumeChart :items="continuousDailyActivity" />
        </article>

        <div class="grid-kpi timeline-kpi-grid">
          <MetricCard :label="t('chat.mostActiveMonth')" :value="mostActiveMonthLabel" />
          <MetricCard :label="t('chat.trend')" :value="trendLabel" />
          <MetricCard :label="t('chat.silences')"
            :value="formatNumber(chat?.conversationFacts.silencePeriodsOver30Days.length ?? 0)" />
          <MetricCard :label="t('chat.silenceDays')" :value="formatNumber(totalLongSilenceDays)" />
        </div>

        <article class="card section-card">
          <div class="section-copy">
            <span class="text-label">{{ t('chat.sessions') }}</span>
            <h2 class="text-h2">{{ t('chat.sessionsTitle') }}</h2>
            <p class="text-body-sm section-text">{{ t('chat.sessionsText') }}</p>
          </div>

          <div class="facts-grid">
            <div v-for="fact in sessionFacts" :key="fact.key" class="fact-card"
              :class="metricCardToneClass(fact.tone ?? 'default')">
              <span class="text-label">{{ fact.label }}</span>
              <strong class="fact-value mono-value">{{ fact.value }}</strong>
              <span class="text-caption">{{ fact.sub }}</span>
            </div>
          </div>

          <div v-if="sessionStats?.highlights.length" class="timeline-gap-grid">
            <div v-for="session in sessionStats.highlights" :key="session.startedAt" class="gap-card">
              <span class="text-label">
                {{
                  densestSessionHighlight
                    && session.startedAt === densestSessionHighlight.startedAt
                    && session.endedAt === densestSessionHighlight.endedAt
                    ? t('chat.sessionWindowPeak')
                    : longestSessionHighlight
                      && session.startedAt === longestSessionHighlight.startedAt
                      && session.endedAt === longestSessionHighlight.endedAt
                      ? t('chat.sessionWindowLongest')
                      : t('chat.sessionWindowDefault')
                }}
              </span>
              <strong class="gap-value mono-value">{{ formatNumber(session.totalMessages) }} {{ t('common.messages') }}</strong>
              <span class="text-body-sm">{{ formatDateRange(session.startedAt, session.endedAt) }}</span>
              <span class="text-caption">
                {{ formatDurationFromSec(session.durationSec) }} • {{ formatNumber(session.sentMessages) }} / {{ formatNumber(session.receivedMessages) }}
              </span>
              <span class="text-caption metric-explainer">
                {{ t('chat.sessionWindowExplainer') }}
              </span>
            </div>
          </div>
        </article>

        <article class="card section-card">
          <div class="section-copy">
            <span class="text-label">{{ t('chat.longSilences') }}</span>
            <h2 class="text-h2">{{ t('chat.breaks') }}</h2>
            <p class="text-body-sm section-text">
              {{ t('chat.silenceSummary', {
                count: formatNumber(chat?.conversationFacts.silencePeriodsOver30Days.length ?? 0),
                days: formatNumber(totalLongSilenceDays),
              }) }}
            </p>
          </div>

          <div v-if="chat?.conversationFacts.silencePeriodsOver30Days.length" class="timeline-gap-grid">
            <div v-for="(gap, index) in chat.conversationFacts.silencePeriodsOver30Days" :key="`${gap.from}-${gap.to}`"
              class="gap-card stagger-item" :style="{ '--delay': `${index * 40}ms` }">
              <strong class="gap-value mono-value">{{ formatDurationFromSec(gap.seconds) }}</strong>
              <span class="text-body-sm">{{ formatDateRange(gap.from, gap.to) }}</span>
            </div>
          </div>

          <EmptyState v-else :icon="Clock" :title="t('chat.noLongSilenceTitle')" :description="t('chat.noLongSilenceDescription')" />
        </article>

        <article class="card section-card">
          <div class="section-copy">
            <span class="text-label">{{ t('chat.insights') }}</span>
            <h2 class="text-h2">{{ t('chat.insightsTitle') }}</h2>
            <p class="text-body-sm section-text">{{ t('chat.insightsText') }}</p>
          </div>

          <div v-if="insightItems.length" class="insights-list">
            <div v-for="item in insightItems" :key="item.key" class="insight-card">
              <div class="insight-head">
                <strong>{{ item.title }}</strong>
              </div>
              <p class="text-body-sm section-text">{{ item.description }}</p>
            </div>
          </div>

          <EmptyState v-else :icon="BarChart2" :title="t('chat.insightsEmptyTitle')" :description="t('chat.insightsEmptyDescription')" />
        </article>
      </section>

      <Teleport to="body">
        <Transition name="dialog">
          <div v-if="shareOpen && isMobileLayout" class="dialog-backdrop no-print" @click.self="shareOpen = false">
            <section class="dialog-panel share-dialog-panel" role="dialog" aria-modal="true" :aria-labelledby="`share-title-${routeChatId}`">
              <div class="share-sheet-head">
                <div class="section-copy">
                  <span class="text-label">{{ t('chat.shareLabel') }}</span>
                  <h2 :id="`share-title-${routeChatId}`" class="text-h3">{{ t('chat.shareTitle') }}</h2>
                  <p class="text-body-sm section-text">{{ t('chat.shareText') }}</p>
                </div>
                <button class="share-sheet-close" type="button" :aria-label="t('common.close')" @click="shareOpen = false">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m7 7 10 10M17 7 7 17" />
                  </svg>
                </button>
              </div>
              <div class="share-dialog-actions">
                <button v-for="item in shareActions" :key="item.key" type="button" class="share-option share-option-card"
                  @click="item.action">
                  {{ item.label }}
                </button>
              </div>
            </section>
          </div>
        </Transition>
      </Teleport>

      <Transition name="popover">
        <div v-if="expandedChart" class="chart-overlay no-print" @click.self="closeExpandedChart">
          <div class="chart-overlay-panel">
            <div class="chart-overlay-head">
              <strong>{{ t('chat.expandChart') }}</strong>
              <Button variant="ghost" size="sm" @click="closeExpandedChart">{{ t('chat.closeChart') }}</Button>
            </div>

            <div class="chart-overlay-body">
              <BalanceChart v-if="expandedChart === 'balance'" :sent="chat?.sentMessages ?? 0"
                :received="chat?.receivedMessages ?? 0" />
              <CompositionChart v-else-if="expandedChart === 'composition'" :composition="messageComposition" />
              <ActivityHeatmap v-else-if="expandedChart === 'heatmap'" :points="continuousDailyActivity" />
              <WeekdayChart v-else-if="expandedChart === 'weekday'" :activity="chat?.weekdayActivity ?? {}" />
              <HourlyChart v-else-if="expandedChart === 'hourly'" :activity="chat?.hourlyActivitySplit ?? {}" />
              <DailyVolumeChart v-else :items="continuousDailyActivity" />
            </div>
          </div>
        </div>
      </Transition>

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
  </AppLayout>
</template>

<style scoped>
.page-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
}

.pdf-export-clone {
  background: #fff;
}

.pdf-export-clone .no-print,
.pdf-export-clone .dialog-backdrop,
.pdf-export-clone .chart-overlay {
  display: none !important;
}

.pdf-export-clone .report-header {
  position: static;
  top: auto;
  backdrop-filter: none;
  background: #fff;
}

.pdf-export-clone .card,
.pdf-export-clone .report-header {
  box-shadow: none;
}

.pdf-export-clone .report-header,
.pdf-export-clone .section-card,
.pdf-export-clone .report-identity-row,
.pdf-export-clone .report-meta-list,
.pdf-export-clone .report-meta-row,
.pdf-export-clone .report-highlight-item,
.pdf-export-clone .report-peek-card,
.pdf-export-clone .fact-card,
.pdf-export-clone .gap-card,
.pdf-export-clone .insight-card,
.pdf-export-clone .balance-summary-row,
.pdf-export-clone .word-chip,
.pdf-export-clone .info-banner,
.pdf-export-clone .info-banner-tone {
  background: #ffffff !important;
  background-image: none !important;
  border-color: #d9d9d9 !important;
  color: #111111 !important;
}

.pdf-export-clone .report-meta-label,
.pdf-export-clone .text-label,
.pdf-export-clone .text-caption,
.pdf-export-clone .section-text,
.pdf-export-clone .balance-summary-label,
.pdf-export-clone .balance-summary-note,
.pdf-export-clone .report-peek-detail,
.pdf-export-clone .report-subtitle {
  color: #5f5f5f !important;
}

.info-banner {
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-secondary);
}

.info-banner-tone {
  border-color: var(--color-info);
  background: var(--color-info-muted);
  color: var(--color-info);
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

.toolbar-back-label {
  display: inline-flex;
}

.toolbar-actions>* {
  flex: 0 0 auto;
}

.toolbar-skeleton-slot {
  display: inline-flex;
  flex: 0 0 auto;
}

.page-toolbar-skeleton {
  margin-bottom: 16px;
}

.toolbar-actions :deep(.popover-root) {
  flex: 0 0 auto;
}

.toolbar-actions :deep(.ui-button) {
  min-height: 34px;
  height: 34px;
  white-space: nowrap;
}

.toolbar-icon-button {
  width: 34px;
  min-width: 34px;
  padding-inline: 0;
}

.report-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-surface) 94%, transparent);
  backdrop-filter: blur(10px);
  min-width: 0;
}

.report-heading {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(260px, 0.9fr);
  gap: var(--space-3);
  min-width: 0;
}

.report-identity-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--accent-subtle) 92%, transparent), transparent 58%),
    linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 94%, transparent), color-mix(in srgb, var(--bg-surface) 96%, transparent));
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
  gap: var(--space-3);
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

.report-skeleton-meta {
  width: 100%;
}

.report-avatar-skeleton,
.report-highlight-skeleton,
.report-meta-skeleton {
  width: 100%;
}

.section-card {
  gap: var(--space-5);
  min-width: 0;
  padding: var(--space-5);
  overflow: hidden;
  border: 1px solid var(--border-default);
  background: color-mix(in srgb, var(--bg-surface) 96%, transparent);
}

.section-copy {
  gap: var(--space-1);
}

.report-title {
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: anywhere;
  font-size: clamp(24px, 2.4vw, 30px);
  line-height: 1.08;
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
  gap: 6px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-surface) 84%, transparent);
}

.report-highlight-value {
  font-size: 16px;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.report-meta-list,
.section-text {
  color: var(--text-secondary);
}

.report-meta-list {
  display: grid;
  gap: var(--space-2);
  align-content: start;
  padding: var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 94%, transparent), color-mix(in srgb, var(--bg-surface) 98%, transparent));
}

.report-meta-row {
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  row-gap: 4px;
  max-width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-surface) 80%, transparent);
  font-size: 12px;
  line-height: 1.35;
}

.report-meta-label {
  color: var(--text-tertiary);
}

.report-meta-value {
  min-width: 0;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.stale-indicator {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 var(--space-2);
  border: 1px solid color-mix(in srgb, var(--info) 32%, var(--border-subtle));
  border-radius: var(--radius-sm);
  background: var(--info-subtle);
  color: var(--color-info);
  font-size: 12px;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
  min-width: 0;
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
  gap: 6px;
  padding: var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
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

.fact-card .text-label,
.gap-card .text-label,
.insight-card .text-label {
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

.relationship-score {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.relationship-score-value {
  font-size: clamp(28px, 4vw, 40px);
}

.chart-card {
  min-width: 0;
}

.balance-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  align-items: start;
}

.balance-summary-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: var(--bg-elevated);
}

.balance-summary-row strong {
  font-size: 20px;
}

.balance-summary-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}

.balance-summary-share {
  color: var(--text-secondary);
  font-size: 12px;
}

.balance-summary-note {
  grid-column: 1 / -1;
  color: var(--text-secondary);
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

.share-option {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 40px;
  width: 100%;
  min-width: 0;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
  white-space: normal;
  text-align: left;
  overflow-wrap: anywhere;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.share-trigger-icon {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.share-option:hover {
  background: var(--bg-elevated);
}

.share-sheet-head,
.share-sheet-close {
  display: none;
}

.share-dialog-panel {
  width: min(100%, 460px);
}

.share-dialog-actions {
  display: grid;
  gap: var(--space-2);
}

.share-option-card {
  min-height: 52px;
  padding: 0 var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
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

.chart-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: var(--space-3);
  background: color-mix(in srgb, var(--bg-base) 82%, transparent);
  backdrop-filter: blur(10px);
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.64);
}

.dialog-panel {
  display: flex;
  width: min(100%, 420px);
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-5);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-lg);
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity var(--transition-base);
}

.dialog-enter-active .dialog-panel,
.dialog-leave-active .dialog-panel {
  transition: transform var(--transition-base);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-panel,
.dialog-leave-to .dialog-panel {
  transform: translateY(8px) scale(0.98);
}

.chart-overlay-panel {
  display: flex;
  flex-direction: column;
  width: min(100%, 860px);
  min-height: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-lg);
}

.chart-overlay-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
}

.chart-overlay-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--space-4);
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
  }

  .report-peek-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {

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
    padding: var(--space-4) var(--space-3);
  }

  .report-heading {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }

  .report-title {
    font-size: 22px;
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
    grid-template-columns: 42px minmax(0, 1fr);
    align-items: start;
    gap: var(--space-2);
  }

  .report-identity-main > :deep(.avatar-shell) {
    width: 42px;
    height: 42px;
    font-size: 13px;
    flex: 0 0 42px;
  }

  .report-highlight-row {
    grid-template-columns: 1fr;
  }

  .report-meta-list {
    padding: var(--space-3);
  }

  .report-title-block {
    flex: 1;
    min-width: 0;
  }

  .facts-grid,
  .timeline-gap-grid {
    grid-template-columns: 1fr;
  }

  .balance-summary {
    grid-template-columns: 1fr;
  }

  .chat-kpi-grid {
    gap: var(--space-2);
  }

  .report-peek-grid {
    gap: var(--space-2);
  }

  .report-peek-card {
    padding: var(--space-3);
  }

  .chart-card {
    cursor: zoom-in;
  }

  .chart-overlay {
    padding: 0;
  }

  .chart-overlay-panel {
    width: 100%;
    border: 0;
    border-radius: 0;
  }

  .chart-overlay-body {
    padding: var(--space-3);
  }

  .chart-overlay-body :deep(.chart-lg) {
    height: 360px;
  }

  .chart-overlay-body :deep(.chart-sm) {
    height: 320px;
  }
}

@media (max-width: 480px) {
  .dialog-backdrop {
    align-items: flex-end;
    padding: var(--space-3);
  }

  .page-toolbar {
    align-items: center;
    gap: var(--space-2);
  }

  .toolbar-actions {
    max-width: calc(100% - 84px);
    gap: 6px;
  }

  .toolbar-actions :deep(.ui-button) {
    min-height: 34px;
    height: 34px;
    min-width: 0;
    padding-inline: var(--space-3);
    font-size: 12px;
  }

  .toolbar-icon-button {
    width: 34px;
    min-width: 34px;
    padding-inline: 0;
  }

  .toolbar-back {
    width: 34px;
    min-width: 34px;
    min-height: 34px;
    height: 34px;
    padding-inline: 0;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
  }

  .toolbar-back-label {
    display: none;
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

  .report-meta-list {
    gap: 6px;
  }

  .report-meta-row {
    grid-template-columns: 1fr;
    row-gap: 1px;
  }

  .stale-indicator {
    min-height: 24px;
    padding-inline: 10px;
    font-size: 12px;
  }

  .section-copy .text-h2 {
    font-size: 20px;
  }

  .section-text {
    overflow-wrap: anywhere;
  }

  .fact-value,
  .gap-value {
    font-size: 18px;
  }

  .share-sheet-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    padding-bottom: var(--space-4);
    margin-bottom: var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
  }

  .share-sheet-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    color: var(--text-secondary);
  }

  .share-sheet-close svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-width: 1.8;
  }

  .share-dialog-panel {
    width: 100%;
    padding: var(--space-4);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }
}

@media (max-width: 640px) {
  .chat-kpi-grid {
    grid-template-columns: 1fr;
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
    background: #fff !important;
    color: #111 !important;
  }

  :global(.app-main) {
    padding: 0 !important;
  }

  .report-header {
    position: static;
    backdrop-filter: none;
    background: #fff;
    box-shadow: none;
    border-color: #d9d9d9;
  }

  .card,
  .fact-card,
  .gap-card,
  .insight-card,
  .balance-summary-row,
  .word-chip,
  .info-banner {
    background: #fff !important;
    color: #111 !important;
    border-color: #d9d9d9 !important;
    box-shadow: none !important;
  }

  .section-text,
  .report-meta,
  .balance-summary-note,
  .text-caption,
  .balance-summary-label {
    color: #555 !important;
  }

  .chart-card,
  .report-grid,
  .facts-grid,
  .timeline-gap-grid {
    break-inside: avoid;
  }
}
</style>
