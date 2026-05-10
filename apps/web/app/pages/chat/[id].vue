<script setup lang="ts">
import AppLayout from '../../components/AppLayout.vue'
import ChatAvatar from '../../components/ChatAvatar.vue'
import ActivityHeatmap from '../../components/stats/ActivityHeatmap.vue'
import BalanceChart from '../../components/stats/BalanceChart.vue'
import CompositionChart from '../../components/stats/CompositionChart.vue'
import DailyVolumeChart from '../../components/stats/DailyVolumeChart.vue'
import EmojiGrid from '../../components/stats/EmojiGrid.vue'
import HourlyChart from '../../components/stats/HourlyChart.vue'
import WeekdayChart from '../../components/stats/WeekdayChart.vue'
import WordsChart from '../../components/stats/WordsChart.vue'
import Badge from '../../components/ui/Badge.vue'
import Button from '../../components/ui/Button.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import MetricCard from '../../components/ui/MetricCard.vue'
import PopoverMenu from '../../components/ui/PopoverMenu.vue'
import SegmentedControl from '../../components/ui/SegmentedControl.vue'
import Skeleton from '../../components/ui/Skeleton.vue'
import { useAuth } from '../../composables/useAuth'
import { useI18n } from '../../composables/useI18n'
import { useParseProgress } from '../../composables/useParseProgress'
import { useStats } from '../../composables/useStats'
import { useToast } from '../../composables/useToast'
import { useAuthStore } from '../../stores/auth'
import { useStatsStore } from '../../stores/stats'

const route = useRoute()
const auth = useAuthStore()
const { bootstrap } = useAuth()
const { fetchChat, fetchParseStatus } = useStats()
const { applyStatus, connect, disconnect } = useParseProgress()
const stats = useStatsStore()
const { t, formatNumber, formatDate: formatLocaleDate, formatRelative, intlLocale } = useI18n()
const toast = useToast()

const ready = ref(false)
const loadError = ref('')
const copied = ref(false)
const reparsing = ref(false)
const shareOpen = ref(false)
const activeView = ref<'overview' | 'rhythm' | 'words' | 'timeline'>('overview')
const isMobileLayout = ref(false)
const expandedChart = ref<null | 'balance' | 'composition' | 'heatmap' | 'weekday' | 'hourly' | 'daily' | 'timeline'>(null)

const routeChatId = computed(() => String(route.params.id))
const chat = computed(() => stats.selectedChat)
const isPrivateChat = computed(() => chat.value?.chatType === 'private')
const totalMessages = computed(() => chat.value?.totalMessages ?? 0)
const sentShare = computed(() => totalMessages.value ? Math.round(((chat.value?.sentMessages ?? 0) / totalMessages.value) * 100) : 0)
const receivedShare = computed(() => 100 - sentShare.value)
const balanceLeadLabel = computed(() => sentShare.value >= receivedShare.value ? t('chat.balanceYouLead') : t('chat.balanceTheyLead'))
const resolvedTextMessageCount = computed(() => {
  if (!chat.value) {
    return 0
  }

  if (chat.value.textMessageCount > 0) {
    return chat.value.textMessageCount
  }

  return Math.max(
    chat.value.totalMessages
    - chat.value.mediaCount
    - chat.value.voiceCount
    - chat.value.stickerCount
    - chat.value.fileCount,
    0,
  )
})
const resolvedComposition = computed(() => {
  if (!chat.value) {
    return { text: 0, media: 0, voice: 0, sticker: 0, file: 0 }
  }

  const stored = chat.value.messageComposition
  const total = stored.text + stored.media + stored.voice + stored.sticker + stored.file
  if (total > 0) {
    return stored
  }

  return {
    text: resolvedTextMessageCount.value,
    media: chat.value.mediaCount ?? 0,
    voice: chat.value.voiceCount ?? 0,
    sticker: chat.value.stickerCount ?? 0,
    file: chat.value.fileCount ?? 0,
  }
})
const responseMineVisible = computed(() => isPrivateChat.value && (chat.value?.responseStats.mineSamples ?? 0) >= 3)
const responseTheirsVisible = computed(() => isPrivateChat.value && (chat.value?.responseStats.theirsSamples ?? 0) >= 3)
const iWriteFirstVisible = computed(() => isPrivateChat.value && ((chat.value?.responseStats.mineSamples ?? 0) + (chat.value?.responseStats.theirsSamples ?? 0)) >= 3)
const overallWordsPerTextMessage = computed(() => {
  if (!chat.value || !resolvedTextMessageCount.value) {
    return '0.0'
  }

  return new Intl.NumberFormat(intlLocale.value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(chat.value.totalWords / resolvedTextMessageCount.value)
})
const peakHour = computed(() => {
  const hourly = chat.value?.hourlyActivitySplit ?? {}
  const entries = Object.entries(hourly)
  if (entries.length) {
    const best = [...entries].sort((left, right) => (right[1]?.total ?? 0) - (left[1]?.total ?? 0))[0]
    return best ? `${best[0].padStart(2, '0')}:00` : '--:--'
  }

  const fallback = Object.entries(chat.value?.hourlyActivity ?? {})
  if (!fallback.length) {
    return '--:--'
  }

  const best = [...fallback].sort((left, right) => right[1] - left[1])[0]
  return best ? `${best[0].padStart(2, '0')}:00` : '--:--'
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
const showAllSections = computed(() => isMobileLayout.value)
const showOverview = computed(() => showAllSections.value || activeView.value === 'overview')
const showRhythm = computed(() => showAllSections.value || activeView.value === 'rhythm')
const showWords = computed(() => showAllSections.value || activeView.value === 'words')
const showTimeline = computed(() => showAllSections.value || activeView.value === 'timeline')

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
const shareActions = computed(() => [
  { key: 'native', label: t('chat.systemShare'), action: shareNative },
  { key: 'copy', label: copied.value ? t('chat.copied') : t('chat.copyLink'), action: copyReportLink },
  { key: 'telegram', label: 'Telegram', action: () => shareTo('telegram') },
  { key: 'whatsapp', label: 'WhatsApp', action: () => shareTo('whatsapp') },
  { key: 'x', label: 'X', action: () => shareTo('x') },
  { key: 'print', label: t('chat.savePdf'), action: printReport },
])

async function refreshReport() {
  loadError.value = ''

  try {
    await fetchChat(routeChatId.value)
    toast.success(t('common.refreshed'))
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('chat.loadError')
    toast.error(loadError.value)
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
    applyStatus(await fetchParseStatus())
    connect()
    toast.success(t('chat.reparseStarted'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('chat.reparseError'))
  } finally {
    reparsing.value = false
  }
}

async function copyReportLink() {
  if (!import.meta.client) {
    return
  }

  await navigator.clipboard.writeText(window.location.href)
  copied.value = true
  shareOpen.value = false
  toast.success(t('chat.copied'))
  window.setTimeout(() => {
    copied.value = false
  }, 1400)
}

async function shareNative() {
  if (!import.meta.client) {
    return
  }

  const title = `${chat.value?.chatName || 'Telegram chat'} ${t('common.report')}`
  const text = `TG Analyzer: ${formatNumber(totalMessages.value)} ${t('common.messages')}, ${formatNumber(chat.value?.conversationFacts.activeDays ?? 0)} ${t('chat.activeDays')}.`
  if (navigator.share) {
    await navigator.share({
      title,
      text,
      url: window.location.href,
    })
    shareOpen.value = false
    toast.success(t('chat.shared'))
    return
  }

  await copyReportLink()
}

function shareTo(service: 'telegram' | 'whatsapp' | 'x') {
  if (!import.meta.client) {
    return
  }

  const url = encodeURIComponent(window.location.href)
  const text = encodeURIComponent(`TG Analyzer: ${chat.value?.chatName || routeChatId.value}`)
  const targets = {
    telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    whatsapp: `https://wa.me/?text=${text}%20${url}`,
    x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
  }

  shareOpen.value = false
  window.open(targets[service], '_blank', 'noopener,noreferrer')
  toast.info(t('chat.shareOpened'))
}

function printReport() {
  if (!import.meta.client) {
    return
  }

  shareOpen.value = false
  window.print()
  toast.info(t('chat.printReady'))
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

function closeExpandedChart() {
  expandedChart.value = null
}

onMounted(async () => {
  setMobileLayout()
  if (import.meta.client) {
    window.addEventListener('resize', setMobileLayout)
  }

  try {
    const refreshed = await bootstrap()
    if (!auth.isAuthorized && !refreshed) {
      await navigateTo('/login')
      return
    }

    await fetchChat(routeChatId.value)
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
    <div v-if="!ready" class="page-stack">
      <section class="card">
        <Skeleton height="220px" radius="var(--radius-lg)" />
      </section>
      <div class="grid-kpi">
        <Skeleton v-for="item in 4" :key="item" height="120px" radius="var(--radius-md)" />
      </div>
      <section class="card">
        <Skeleton height="420px" radius="var(--radius-lg)" />
      </section>
    </div>

    <div v-else-if="loadError" class="page-stack animate-fade-in">
      <EmptyState :title="t('chat.loadErrorTitle')" :description="loadError">
        <template #action>
          <div class="error-actions">
            <Button variant="secondary" @click="navigateTo('/dashboard')">{{ t('common.back') }}</Button>
            <Button variant="primary" @click="refreshReport">{{ t('common.refresh') }}</Button>
          </div>
        </template>
      </EmptyState>
    </div>

    <div v-else class="page-stack animate-fade-in">
      <header class="report-header">
        <div class="page-toolbar no-print">
          <Button variant="ghost" class="toolbar-back" @click="navigateTo('/dashboard')">
            <template #icon>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 18 9 12l6-6" />
              </svg>
            </template>
            {{ t('common.back') }}
          </Button>

          <div class="toolbar-actions">
            <Button variant="secondary" size="sm" :loading="reparsing"
              :disabled="auth.user?.telegramSessionActive === false"
              :title="auth.user?.telegramSessionActive === false ? t('dashboard.sessionInactive') : undefined"
              @click="reparseChat">
              {{ reparsing ? t('chat.starting') : t('chat.reparse') }}
            </Button>

            <PopoverMenu v-model:open="shareOpen">
              <template #trigger>
                <Button variant="ghost" size="sm" @click="shareOpen = !shareOpen">{{ t('chat.share') }}</Button>
              </template>
              <button v-for="item in shareActions" :key="item.key" type="button" class="share-option"
                @click="item.action">
                {{ item.label }}
              </button>
            </PopoverMenu>
          </div>
        </div>

        <div class="report-heading">
          <ChatAvatar :chat-id="chat?.tgChatId || routeChatId" :title="chat?.chatName || chat?.tgChatId" size="lg" />

          <div class="report-title-block">
            <div class="title-row">
              <h1 class="text-h1 report-title">{{ chat?.chatName || chat?.tgChatId }}</h1>
            </div>

            <div class="report-meta text-body-sm">
              <span>{{ t('chat.firstMsg') }}: <span class="mono-value">{{ formatDate(chat?.firstMessageAt ?? null)
                  }}</span></span>
              <span>{{ t('chat.last') }}: <span class="mono-value">{{ formatDate(chat?.lastMessageAt ?? null)
                  }}</span></span>
            </div>

            <div class="report-meta text-body-sm">
              <span>{{ t('chat.lastAnalyzed') }}: <span class="mono-value">{{ formatRelative(chat?.parsedAt ?? null)
                  }}</span></span>
            </div>
          </div>
        </div>

        <div class="grid-kpi chat-kpi-grid">
          <MetricCard :label="t('chat.messages')" :value="formatNumber(totalMessages)" />
          <MetricCard :label="t('chat.yourShare')" :value="`${sentShare}%`" />
          <MetricCard :label="t('chat.wordsPerTextMsg')" :value="overallWordsPerTextMessage" />
          <MetricCard :label="t('chat.peakHour')" :value="peakHour" :sub="t('chat.peakHourSub')" />
        </div>
      </header>

      <div v-if="!showAllSections" class="tabs-scroll no-print">
        <SegmentedControl v-model="activeView" :options="reportViews" />
      </div>

      <section v-if="showOverview" class="report-grid">
        <article class="card section-card chart-card" @click="openChart('balance')">
          <div class="section-header">
            <div class="section-copy">
              <span class="text-label">{{ t('chat.balance') }}</span>
              <h2 class="text-h2">{{ t('chat.sentReceived') }}</h2>
              <p class="text-body-sm section-text">{{ t('chat.balanceText') }}</p>
            </div>
            <Badge variant="accent">{{ sentShare }}% / {{ receivedShare }}%</Badge>
          </div>

          <BalanceChart :sent="chat?.sentMessages ?? 0" :received="chat?.receivedMessages ?? 0" />

          <div class="balance-summary">
            <div class="balance-summary-row">
              <span class="balance-summary-label">{{ t('dashboard.sent') }}</span>
              <strong class="mono-value">{{ formatNumber(chat?.sentMessages ?? 0) }}</strong>
            </div>
            <div class="balance-summary-row">
              <span class="balance-summary-label">{{ t('dashboard.recv') }}</span>
              <strong class="mono-value">{{ formatNumber(chat?.receivedMessages ?? 0) }}</strong>
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

        <article class="card section-card report-span chart-card" @click="openChart('composition')">
          <div class="section-copy">
            <span class="text-label">{{ t('chat.messageComposition') }}</span>
            <h2 class="text-h2">{{ t('chat.compositionTitle') }}</h2>
            <p class="text-body-sm section-text">{{ t('chat.compositionText') }}</p>
          </div>

          <CompositionChart :composition="resolvedComposition" />
        </article>
      </section>

      <section v-if="showRhythm" class="page-stack">
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

      <section v-if="showWords" class="page-stack">
        <EmptyState v-if="!hasWords && !hasEmoji" :title="t('chat.noTextTitle')"
          :description="t('chat.noTextDescription')" />

        <template v-else>
          <article class="card section-card">
            <div class="section-copy">
              <span class="text-label">{{ t('chat.words') }}</span>
              <h2 class="text-h2">{{ t('chat.popularWords') }}</h2>
              <p class="text-body-sm section-text">{{ t('chat.wordsText') }}</p>
            </div>

            <WordsChart v-if="hasWords" :mine="topWords.mine" :theirs="topWords.theirs" />
            <EmptyState v-else :title="t('chat.noWordsTitle')" :description="t('chat.noWordsDescription')" />
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
              <EmptyState v-else :title="t('chat.distinctiveMine')" :description="t('chat.noDistinctiveMine')" />
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
              <EmptyState v-else :title="t('chat.distinctiveTheirs')" :description="t('chat.noDistinctiveTheirs')" />
            </article>
          </div>
        </template>
      </section>

      <section v-if="showTimeline" class="page-stack">
        <article class="card section-card chart-card" @click="openChart('timeline')">
          <div class="section-header">
            <div class="section-copy">
              <span class="text-label">{{ t('chat.timeline') }}</span>
              <h2 class="text-h2">{{ t('chat.dailyArc') }}</h2>
              <p class="text-body-sm section-text">{{ t('chat.dailyArcText') }}</p>
            </div>

            <Badge variant="accent">{{ trendLabel }}</Badge>
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

          <EmptyState v-else :title="t('chat.noLongSilenceTitle')" :description="t('chat.noLongSilenceDescription')" />
        </article>
      </section>

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
              <CompositionChart v-else-if="expandedChart === 'composition'" :composition="resolvedComposition" />
              <ActivityHeatmap v-else-if="expandedChart === 'heatmap'" :points="continuousDailyActivity" />
              <WeekdayChart v-else-if="expandedChart === 'weekday'" :activity="chat?.weekdayActivity ?? {}" />
              <HourlyChart v-else-if="expandedChart === 'hourly'" :activity="chat?.hourlyActivitySplit ?? {}" />
              <DailyVolumeChart v-else :items="continuousDailyActivity" />
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </AppLayout>
</template>

<style scoped>
.page-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
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
}

.toolbar-back {
  flex: 0 0 auto;
}

.toolbar-actions>* {
  flex: 0 0 auto;
}

.toolbar-actions :deep(.popover-root) {
  flex: 0 0 auto;
}

.toolbar-actions :deep(.ui-button) {
  white-space: nowrap;
}

.report-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--panel-translucent-strong);
  backdrop-filter: blur(14px);
  min-width: 0;
}

.report-heading {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  min-width: 0;
}

.report-title-block,
.section-card,
.section-copy {
  display: flex;
  flex-direction: column;
}

.report-title-block {
  gap: var(--space-2);
  min-width: 0;
}

.section-card {
  gap: var(--space-5);
  min-width: 0;
}

.section-copy {
  gap: var(--space-2);
}

.report-title {
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: anywhere;
}

.report-meta,
.section-text {
  color: var(--text-secondary);
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-6);
  min-width: 0;
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
.gap-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
}

.fact-value,
.gap-value {
  font-size: 20px;
  color: var(--text-primary);
  overflow-wrap: anywhere;
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
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
}

.balance-summary-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}

.balance-summary-note {
  grid-column: 1 / -1;
  color: var(--text-secondary);
}

.tabs-scroll {
  overflow-x: auto;
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

.share-option:hover {
  background: var(--bg-overlay);
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
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
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

.chart-overlay-panel {
  display: flex;
  flex-direction: column;
  width: min(100%, 860px);
  min-height: 0;
  border: 1px solid var(--border-subtle);
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
}

@media (max-width: 768px) {

  .page-toolbar,
  .report-heading,
  .title-row,
  .section-header {
    flex-direction: column;
    align-items: stretch;
  }

  .page-toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .toolbar-actions {
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: nowrap;
    margin-left: auto;
  }

  .report-header {
    position: static;
    gap: var(--space-3);
    padding: var(--space-3);
  }

  .facts-grid,
  .timeline-gap-grid {
    grid-template-columns: 1fr;
  }

  .balance-summary {
    grid-template-columns: 1fr;
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
  .page-toolbar {
    align-items: flex-start;
  }

  .toolbar-actions {
    max-width: calc(100% - 84px);
    gap: var(--space-2);
  }

  .toolbar-actions :deep(.ui-button) {
    min-width: 0;
    padding-inline: var(--space-3);
    font-size: 13px;
  }
}

@media (max-width: 640px) {
  .chat-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .timeline-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media print {
  .report-header {
    position: static;
    backdrop-filter: none;
    background: var(--bg-surface);
    box-shadow: none;
  }
}
</style>
