<script setup lang="ts">
import type { ChatStatsDto, GroupParticipantDto } from '@tg-analyzer/shared'
import { fillDailyGaps, hasSufficientGroupRetentionPeriod } from '@tg-analyzer/shared'
import ActivityHeatmap from './ActivityHeatmap.vue'
import EmojiGrid from './EmojiGrid.vue'
import SegmentedControl from '../ui/SegmentedControl.vue'
import MetricCard from '../ui/MetricCard.vue'
import EmptyState from '../ui/EmptyState.vue'
import { BarChart2, LayoutGrid, MessageSquare } from '../../lib/icons'

const props = defineProps<{
  chat: ChatStatsDto
}>()

const DailyVolumeChart = defineAsyncComponent(() => import('./DailyVolumeChart.vue'))
const MonthlyChart = defineAsyncComponent(() => import('./MonthlyChart.vue'))

const { locale, formatNumber, formatDate, formatRelative } = useI18n()

const isRu = computed(() => locale.value === 'ru')
const continuousDailyActivity = computed(() => fillDailyGaps(props.chat.dailyActivity))
const activeTab = ref<'overview' | 'members' | 'dynamics' | 'network' | 'content'>('overview')
const selectedParticipantId = ref<string | null>(null)

const copy = computed(() =>
  isRu.value
    ? {
        overview: 'Обзор',
        members: 'Участники',
        dynamics: 'Динамика',
        network: 'Взаимодействия',
        content: 'Контент',
        activeMembers: 'Наблюдаемые участники',
        activeNow: 'Писали за 30 дней',
        mostActive: 'Самый активный',
        avgLoad: 'Сообщений на участника',
        avgLoadSub: 'Среднее число сообщений на одного активного участника',
        pulseTitle: 'Кто формирует ядро группы',
        pulseText: 'Распределение сообщений между самыми заметными участниками.',
        healthTitle: 'Показатели группы',
        insightsTitle: 'Что видно сразу',
        insightsEmpty: 'Пока недостаточно сигнала для уверенных выводов.',
        membersTitle: 'Кто и как участвует',
        membersText: 'Здесь видно реальный вклад участников, а не абстрактные рейтинги.',
        spotlight: 'Фокус на участнике',
        role: 'Роль',
        roleWhy: 'Почему такая роль',
        messages: 'Сообщения',
        share: 'Доля сообщений',
        wordsPerMessage: 'Слов в текстовом сообщении',
        media: 'Медиа',
        starters: 'Запускает разговоры',
        repliesReceived: 'Получает ответов',
        magnet: 'Притягивает ответы',
        lastSeen: 'Последняя активность',
        activityWindow: 'Период активности',
        topWords: 'Частые слова',
        signatureWords: 'Фирменные слова',
        topConnections: 'С кем чаще всего пересекается',
        tableTitle: 'Таблица участников',
        monthlyTitle: 'Активность по месяцам',
        dailyTitle: 'Дневной темп',
        heatmapTitle: 'Теплокарта активности',
        networkTitle: 'Структура взаимодействий',
        networkText: 'Кто кому отвечает, кто чаще начинает темы, и какие пары общаются плотнее других.',
        topPairs: 'Самые плотные пары',
        topPairsEmpty: 'Явно выраженных пар пока не видно.',
        pairScore: 'Общий вес взаимодействия',
        pairDirect: 'прямых ответов',
        pairImplied: 'быстрых подхватов',
        starterLeaders: 'Чаще начинают разговоры',
        replyMagnets: 'Чаще получают ответы',
        contentTitle: 'Язык и словарь группы',
        contentText: 'Что объединяет группу и какие слова особенно характерны для отдельных участников.',
        sharedVocabulary: 'Общий словарь',
        uniqueWords: 'Слова отдельных участников',
        signatures: 'Фирменные слова участников',
        topEmoji: 'Популярные эмодзи',
        noGroupData: 'Для этого чата ещё нет группового отчёта.',
        noGroupDataText: 'Нужно заново распарсить чат после обновления аналитики.',
        noParticipants: 'Нет данных об участниках за этот период.',
        noParticipantsText: 'Распределение сообщений появится, когда в отчёте будут данные об участниках.',
        noWords: 'Недостаточно текста для содержательного контентного блока.',
        unknownParticipant: 'Участник',
        momentumGrowing: 'Активных участников стало больше',
        momentumStable: 'Число активных участников стабильно',
        momentumShrinking: 'Активных участников стало меньше',
        gini: 'Концентрация участия',
        retention: 'Сохранение состава',
        responseCoverage: 'Сообщения получают ответы',
        lurkers: 'Почти не пишут',
        churned: 'Выпали из общения',
        peakSimultaneity: 'Пик одновременной активности',
      }
    : {
        overview: 'Overview',
        members: 'Members',
        dynamics: 'Dynamics',
        network: 'Interactions',
        content: 'Content',
        activeMembers: 'Observed members',
        activeNow: 'Posted in 30 days',
        mostActive: 'Most active',
        avgLoad: 'Messages per member',
        avgLoadSub: 'Average messages per active member',
        pulseTitle: 'Who forms the core',
        pulseText: 'How message volume is split across the most visible members.',
        healthTitle: 'Group indicators',
        insightsTitle: 'What stands out',
        insightsEmpty: 'Not enough signal for confident insights yet.',
        membersTitle: 'Who contributes and how',
        membersText: 'A clearer view of contribution instead of abstract rankings.',
        spotlight: 'Member spotlight',
        role: 'Role',
        roleWhy: 'Why this role',
        messages: 'Messages',
        share: 'Message share',
        wordsPerMessage: 'Words per text message',
        media: 'Media',
        starters: 'Starts conversations',
        repliesReceived: 'Replies received',
        magnet: 'Reply magnet',
        lastSeen: 'Last seen',
        activityWindow: 'Activity window',
        topWords: 'Frequent words',
        signatureWords: 'Signature words',
        topConnections: 'Most frequent overlaps',
        tableTitle: 'Participants table',
        monthlyTitle: 'Monthly activity',
        dailyTitle: 'Daily tempo',
        heatmapTitle: 'Activity heatmap',
        networkTitle: 'Interaction structure',
        networkText: 'Who replies to whom, who starts threads, and which pairs are denser than the rest.',
        topPairs: 'Top interaction pairs',
        topPairsEmpty: 'No clearly dominant pairs yet.',
        pairScore: 'Combined interaction weight',
        pairDirect: 'direct replies',
        pairImplied: 'quick follow-ups',
        starterLeaders: 'Conversation starters',
        replyMagnets: 'Reply magnets',
        contentTitle: 'Group language and vocabulary',
        contentText: 'What the group shares and which words are especially typical for specific members.',
        sharedVocabulary: 'Shared vocabulary',
        uniqueWords: 'Words used by few members',
        signatures: 'Member signature words',
        topEmoji: 'Popular emoji',
        noGroupData: 'This chat does not have group analytics yet.',
        noGroupDataText: 'Re-parse the chat after the analytics update to generate it.',
        noParticipants: 'No participant data is available for this period.',
        noParticipantsText: 'The message breakdown will appear when participant data is available in the report.',
        noWords: 'Not enough text for a meaningful content view.',
        unknownParticipant: 'Participant',
        momentumGrowing: 'More members are active',
        momentumStable: 'The number of active members is steady',
        momentumShrinking: 'Fewer members are active',
        gini: 'Participation concentration',
        retention: 'Member retention',
        responseCoverage: 'Messages get replies',
        lurkers: 'Barely contribute',
        churned: 'Dropped off',
        peakSimultaneity: 'Peak simultaneous activity',
      },
)

const groupReport = computed(() => props.chat.groupReport)
const participants = computed(() => groupReport.value?.participants ?? [])
const rankedParticipants = computed(() =>
  [...participants.value].sort((left, right) => right.messageCount - left.messageCount),
)
const health = computed(() => groupReport.value?.health ?? null)
const hasRetentionWindow = computed(() => {
  return hasSufficientGroupRetentionPeriod(
    new Date(props.chat.firstMessageAt ?? ''),
    new Date(props.chat.lastMessageAt ?? ''),
  )
})
const topPairs = computed(() => groupReport.value?.topPairs ?? [])
const sharedVocabulary = computed(() => groupReport.value?.sharedVocabulary ?? [])
const uniqueGroupWords = computed(() => groupReport.value?.uniqueGroupWords ?? [])

const tabs = computed(() => [
  { value: 'overview' as const, label: copy.value.overview },
  { value: 'members' as const, label: copy.value.members },
  { value: 'dynamics' as const, label: copy.value.dynamics },
  { value: 'network' as const, label: copy.value.network },
  { value: 'content' as const, label: copy.value.content },
])

watch(
  rankedParticipants,
  (value) => {
    if (!value.length) {
      selectedParticipantId.value = null
      return
    }
    if (!selectedParticipantId.value || !value.some((participant) => participant.id === selectedParticipantId.value)) {
      selectedParticipantId.value = value[0]?.id ?? null
    }
  },
  { immediate: true },
)

const selectedParticipant = computed(
  () =>
    participants.value.find((participant) => participant.id === selectedParticipantId.value) ??
    rankedParticipants.value[0] ??
    null,
)

const topParticipants = computed(() => rankedParticipants.value.slice(0, 5))
const othersShare = computed(() => {
  const remainingMessages = rankedParticipants.value
    .slice(topParticipants.value.length)
    .reduce((sum, participant) => sum + participant.messageCount, 0)
  return props.chat.totalMessages > 0 ? Number(((remainingMessages / props.chat.totalMessages) * 100).toFixed(1)) : 0
})

const overviewMetrics = computed(() => [
  {
    label: copy.value.activeMembers,
    value: formatNumber(health.value?.activeMembers ?? participants.value.length),
    sub: null,
  },
  {
    label: copy.value.activeNow,
    value: health.value ? formatNumber(health.value.activeMembersLast30Days) : '—',
    sub: null,
  },
  {
    label: copy.value.mostActive,
    value: normalizeDisplayName(topParticipants.value[0]?.name) ?? '—',
    sub: topParticipants.value[0] ? `${topParticipants.value[0].messageShare}%` : null,
  },
  {
    label: copy.value.avgLoad,
    value: participants.value.length
      ? formatNumber(Math.round(props.chat.totalMessages / participants.value.length))
      : '—',
    sub: copy.value.avgLoadSub,
  },
])

const healthFacts = computed(() =>
  health.value
    ? [
        { label: copy.value.gini, value: `${formatNumber(health.value.giniCoefficient * 100)}%` },
        ...(!hasRetentionWindow.value || health.value.retentionRate === null
          ? []
          : [{ label: copy.value.retention, value: `${health.value.retentionRate}%` }]),
        { label: copy.value.responseCoverage, value: `${health.value.responseCoverage}%` },
        { label: copy.value.lurkers, value: `${health.value.lurkerRatio}%` },
        { label: copy.value.churned, value: formatNumber(health.value.churnedMembers) },
        { label: copy.value.peakSimultaneity, value: formatNumber(health.value.peakSimultaneity) },
      ]
    : [],
)

const insights = computed(() => {
  const items: string[] = []
  const top = topParticipants.value[0]

  if (top && top.messageShare >= 35) {
    items.push(
      isRu.value
        ? `На сообщения ${normalizeDisplayName(top.name)} приходится ${top.messageShare}% от общего числа.`
        : `${normalizeDisplayName(top.name)} accounts for ${top.messageShare}% of group messages.`,
    )
  }

  if ((health.value?.lurkerRatio ?? 0) >= 45) {
    items.push(
      isRu.value
        ? 'Основная часть общения держится на сравнительно узком круге людей.'
        : 'Most of the conversation is concentrated in a relatively small core.',
    )
  }

  if (topPairs.value[0]) {
    const pair = topPairs.value[0]
    items.push(
      isRu.value
        ? `Самая плотная связка — ${pair.leftParticipantName} и ${pair.rightParticipantName}.`
        : `The densest pair is ${pair.leftParticipantName} and ${pair.rightParticipantName}.`,
    )
  }

  if (health.value?.momentum === 'growing') {
    items.push(
      isRu.value ? 'В последние недели группа оживилась.' : 'The group has become more active in recent weeks.',
    )
  }

  return items.slice(0, 4)
})

const networkPairs = computed(() =>
  topPairs.value.map((pair) => ({
    ...pair,
    leftParticipantName: normalizeDisplayName(pair.leftParticipantName),
    rightParticipantName: normalizeDisplayName(pair.rightParticipantName),
  })),
)

const selectedParticipantConnections = computed(() => {
  if (!selectedParticipant.value) {
    return []
  }

  return networkPairs.value
    .filter(
      (pair) =>
        pair.leftParticipantId === selectedParticipant.value?.id ||
        pair.rightParticipantId === selectedParticipant.value?.id,
    )
    .map((pair) => ({
      name:
        pair.leftParticipantId === selectedParticipant.value?.id ? pair.rightParticipantName : pair.leftParticipantName,
      score: pair.symmetricScore,
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
})

const starterLeaders = computed(() =>
  [...participants.value].sort((left, right) => right.starterShare - left.starterShare).slice(0, 8),
)

const replyMagnets = computed(() =>
  [...participants.value].sort((left, right) => (right.magnetScore ?? 0) - (left.magnetScore ?? 0)).slice(0, 8),
)

function normalizeDisplayName(name: string | null | undefined) {
  if (!name) {
    return copy.value.unknownParticipant
  }
  if (
    /^unknown participant$/i.test(name) ||
    /^user unknown$/i.test(name) ||
    /^name unavailable$/i.test(name) ||
    /^profile unknown$/i.test(name) ||
    /^profile\s+\S+/i.test(name)
  ) {
    return copy.value.unknownParticipant
  }
  return name
}

function roleLabel(participant: GroupParticipantDto) {
  const labels = isRu.value
    ? {
        anchor: 'Ядро',
        contributor: 'Активный участник',
        newcomer: 'Новичок',
        inactive: 'Неактивен давно',
      }
    : {
        anchor: 'Core',
        contributor: 'Active contributor',
        newcomer: 'Newcomer',
        inactive: 'Long inactive',
      }
  return labels[participant.role]
}

function roleDescription(participant: GroupParticipantDto) {
  const share = participant.messageShare
  const starter = participant.starterShare
  const consistency = participant.consistencyScore
  const role = participant.role

  if (role === 'anchor') {
    return isRu.value
      ? `Один из участников ядра: ${share}% сообщений и ${starter}% запусков разговоров.`
      : `One of the core members: ${share}% of messages and ${starter}% of conversation starts.`
  }
  if (role === 'newcomer') {
    return isRu.value
      ? `Появился недавно и ещё не успел занять устойчивое место в структуре группы.`
      : `Joined recently and has not yet settled into a stable role in the group.`
  }
  if (role === 'inactive') {
    return isRu.value
      ? `Раньше участвовал, но давно не появляется в беседе. По этим данным нельзя надёжно определить, вышел человек из группы или просто замолчал.`
      : `Used to participate, but has not appeared in the conversation for a long time. These signals cannot reliably tell whether the person left the group or simply went quiet.`
  }
  return isRu.value
    ? `Регулярный участник без сильного доминирования: ${share}% сообщений, регулярность ${consistency}%.`
    : `A regular contributor without heavy dominance: ${share}% of messages and ${consistency}% consistency.`
}

function participantLastSeen(participant: GroupParticipantDto) {
  return participant.lastSeen ? formatRelative(participant.lastSeen) : '—'
}

function activityWindow(participant: GroupParticipantDto) {
  if (!participant.firstSeen || !participant.lastSeen) {
    return '—'
  }
  return `${formatDate(participant.firstSeen, { month: 'short', day: 'numeric', year: 'numeric' })} - ${formatDate(participant.lastSeen, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function momentumLabel(value: 'growing' | 'stable' | 'shrinking' | 'unknown') {
  if (value === 'growing') {
    return copy.value.momentumGrowing
  }
  if (value === 'shrinking') {
    return copy.value.momentumShrinking
  }
  return value === 'stable' ? copy.value.momentumStable : null
}
</script>

<template>
  <div v-if="!groupReport" class="page-stack">
    <EmptyState :icon="LayoutGrid" :title="copy.noGroupData" :description="copy.noGroupDataText" />
  </div>

  <div v-else class="page-stack">
    <div class="grid-kpi group-kpi-grid">
      <MetricCard
        v-for="item in overviewMetrics"
        :key="item.label"
        :label="item.label"
        :value="item.value"
        :sub="item.sub"
      />
    </div>

    <div class="group-tabs-scroll">
      <SegmentedControl v-model="activeTab" :options="tabs" />
    </div>

    <section v-if="activeTab === 'overview'" class="page-stack">
      <article class="card section-card">
        <div class="section-copy">
          <span class="t-label">{{ copy.overview }}</span>
          <h2 class="t-h2">{{ copy.pulseTitle }}</h2>
          <p class="t-small section-text">{{ copy.pulseText }}</p>
        </div>

        <div v-if="participants.length" class="participant-bars">
          <div v-for="participant in topParticipants" :key="participant.id" class="participant-bar-row">
            <div class="participant-bar-head">
              <strong>{{ normalizeDisplayName(participant.name) }}</strong>
              <span class="t-mono">{{ participant.messageShare }}%</span>
            </div>
            <div class="participant-bar-track">
              <div class="participant-bar-fill" :style="{ width: `${participant.messageShare}%` }" />
            </div>
          </div>

          <div v-if="othersShare > 0" class="participant-bar-row">
            <div class="participant-bar-head">
              <strong>{{ isRu ? 'Остальные' : 'Others' }}</strong>
              <span class="t-mono">{{ othersShare }}%</span>
            </div>
            <div class="participant-bar-track">
              <div class="participant-bar-fill participant-bar-fill-muted" :style="{ width: `${othersShare}%` }" />
            </div>
          </div>
        </div>
        <EmptyState v-else :icon="LayoutGrid" :title="copy.noParticipants" :description="copy.noParticipantsText" />
      </article>

      <article v-if="health" class="card section-card">
        <div class="section-copy">
          <h2 class="t-h2">{{ copy.healthTitle }}</h2>
          <p v-if="momentumLabel(health.momentum)" class="t-small section-text">
            {{ momentumLabel(health.momentum) }}
          </p>
        </div>

        <div class="facts-grid">
          <div v-for="fact in healthFacts" :key="fact.label" class="fact-card">
            <span class="t-label">{{ fact.label }}</span>
            <strong class="fact-value t-mono">{{ fact.value }}</strong>
          </div>
        </div>
      </article>

      <article class="card section-card">
        <div class="section-copy">
          <h2 class="t-h2">{{ copy.insightsTitle }}</h2>
        </div>

        <div v-if="insights.length" class="insights-grid">
          <div v-for="item in insights" :key="item" class="insight-card">
            <p class="t-small section-text">{{ item }}</p>
          </div>
        </div>
        <EmptyState v-else :icon="BarChart2" :title="copy.insightsTitle" :description="copy.insightsEmpty" />
      </article>
    </section>

    <section v-else-if="activeTab === 'members'" class="page-stack">
      <article class="card section-card">
        <div class="section-copy">
          <span class="t-label">{{ copy.members }}</span>
          <h2 class="t-h2">{{ copy.membersTitle }}</h2>
          <p class="t-small section-text">{{ copy.membersText }}</p>
        </div>

        <div class="members-table-wrap">
          <table class="members-table">
            <thead>
              <tr>
                <th>{{ copy.members }}</th>
                <th>{{ copy.role }}</th>
                <th>{{ copy.messages }}</th>
                <th>{{ copy.share }}</th>
                <th>{{ copy.wordsPerMessage }}</th>
                <th>{{ copy.media }}</th>
                <th>{{ copy.starters }}</th>
                <th>{{ copy.magnet }}</th>
                <th>{{ copy.lastSeen }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="participant in rankedParticipants"
                :key="participant.id"
                :class="{ 'member-row-active': participant.id === selectedParticipantId }"
                @click="selectedParticipantId = participant.id"
              >
                <td>{{ normalizeDisplayName(participant.name) }}</td>
                <td>{{ roleLabel(participant) }}</td>
                <td>{{ formatNumber(participant.messageCount) }}</td>
                <td>{{ participant.messageShare }}%</td>
                <td>{{ participant.avgWordsPerMessage?.toFixed(1) ?? '—' }}</td>
                <td>{{ formatNumber(participant.mediaCount) }}</td>
                <td>{{ participant.starterShare }}%</td>
                <td>{{ participant.magnetScore?.toFixed(2) ?? '—' }}</td>
                <td>{{ participantLastSeen(participant) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article v-if="selectedParticipant" class="card section-card spotlight-card">
        <div class="spotlight-head">
          <div class="section-copy">
            <span class="t-label">{{ copy.spotlight }}</span>
            <h2 class="t-h2">{{ normalizeDisplayName(selectedParticipant.name) }}</h2>
            <p class="t-small section-text">{{ activityWindow(selectedParticipant) }}</p>
          </div>

          <div class="spotlight-badge">
            <span class="t-label">{{ copy.role }}</span>
            <strong class="t-metric-md">{{ roleLabel(selectedParticipant) }}</strong>
          </div>
        </div>

        <div class="facts-grid">
          <div class="fact-card">
            <span class="t-label">{{ copy.messages }}</span>
            <strong class="fact-value t-mono">{{ formatNumber(selectedParticipant.messageCount) }}</strong>
          </div>
          <div class="fact-card">
            <span class="t-label">{{ copy.share }}</span>
            <strong class="fact-value t-mono">{{ selectedParticipant.messageShare }}%</strong>
          </div>
          <div class="fact-card">
            <span class="t-label">{{ copy.starters }}</span>
            <strong class="fact-value t-mono">{{ selectedParticipant.starterShare }}%</strong>
          </div>
          <div class="fact-card">
            <span class="t-label">{{ copy.repliesReceived }}</span>
            <strong class="fact-value t-mono">{{ formatNumber(selectedParticipant.repliesReceived) }}</strong>
          </div>
        </div>

        <div class="spotlight-explainer">
          <span class="t-label">{{ copy.roleWhy }}</span>
          <p class="t-small section-text">{{ roleDescription(selectedParticipant) }}</p>
        </div>

        <div class="report-grid">
          <article class="subcard">
            <span class="t-label">{{ copy.topWords }}</span>
            <div class="chip-wrap">
              <span v-for="item in selectedParticipant.topWords" :key="item.value" class="word-chip">
                {{ item.value }} <span class="t-mono chip-count">{{ formatNumber(item.count) }}</span>
              </span>
            </div>
          </article>

          <article class="subcard">
            <span class="t-label">{{ copy.signatureWords }}</span>
            <div class="chip-wrap">
              <span v-for="item in selectedParticipant.topicSignature" :key="item.value" class="word-chip">
                {{ item.value }}
              </span>
            </div>
          </article>
        </div>

        <article class="subcard">
          <span class="t-label">{{ copy.topConnections }}</span>
          <div v-if="selectedParticipantConnections.length" class="connection-list">
            <div v-for="item in selectedParticipantConnections" :key="item.name" class="connection-row">
              <span>{{ item.name }}</span>
              <strong class="t-mono">{{ formatNumber(item.score) }}</strong>
            </div>
          </div>
          <p v-else class="t-small section-text">{{ copy.topPairsEmpty }}</p>
        </article>
      </article>
    </section>

    <section v-else-if="activeTab === 'dynamics'" class="page-stack">
      <article class="card section-card">
        <div class="section-copy">
          <span class="t-label">{{ copy.dynamics }}</span>
          <h2 class="t-h2">{{ copy.monthlyTitle }}</h2>
        </div>
        <MonthlyChart :items="chat.monthlyActivity" />
      </article>

      <article class="card section-card">
        <div class="section-copy">
          <span class="t-label">{{ copy.dynamics }}</span>
          <h2 class="t-h2">{{ copy.dailyTitle }}</h2>
        </div>
        <DailyVolumeChart :items="continuousDailyActivity" />
      </article>

      <article class="card section-card">
        <div class="section-copy">
          <span class="t-label">{{ copy.dynamics }}</span>
          <h2 class="t-h2">{{ copy.heatmapTitle }}</h2>
        </div>
        <ActivityHeatmap :points="continuousDailyActivity" />
      </article>
    </section>

    <section v-else-if="activeTab === 'network'" class="page-stack">
      <article class="card section-card">
        <div class="section-copy">
          <span class="t-label">{{ copy.network }}</span>
          <h2 class="t-h2">{{ copy.networkTitle }}</h2>
          <p class="t-small section-text">{{ copy.networkText }}</p>
        </div>

        <div v-if="networkPairs.length" class="pairs-grid">
          <article
            v-for="pair in networkPairs"
            :key="`${pair.leftParticipantId}-${pair.rightParticipantId}`"
            class="pair-card"
          >
            <div class="pair-head">
              <strong>{{ pair.leftParticipantName }} × {{ pair.rightParticipantName }}</strong>
              <span class="pair-score">{{ formatNumber(pair.symmetricScore) }}</span>
            </div>
            <div class="pair-meta">
              <span>{{ copy.pairScore }}</span>
              <span>{{ formatNumber(pair.directReplies) }} {{ copy.pairDirect }}</span>
              <span>{{ formatNumber(pair.impliedReplies) }} {{ copy.pairImplied }}</span>
            </div>
          </article>
        </div>
        <EmptyState v-else :icon="LayoutGrid" :title="copy.topPairs" :description="copy.topPairsEmpty" />
      </article>

      <div class="report-grid">
        <article class="card section-card">
          <div class="section-copy">
            <span class="t-label">{{ copy.network }}</span>
            <h2 class="t-h2">{{ copy.starterLeaders }}</h2>
          </div>
          <div class="rank-list">
            <div v-for="participant in starterLeaders" :key="`starter-${participant.id}`" class="rank-row">
              <span>{{ normalizeDisplayName(participant.name) }}</span>
              <strong class="t-mono">{{ participant.starterShare }}%</strong>
            </div>
          </div>
        </article>

        <article class="card section-card">
          <div class="section-copy">
            <span class="t-label">{{ copy.network }}</span>
            <h2 class="t-h2">{{ copy.replyMagnets }}</h2>
          </div>
          <div class="rank-list">
            <div v-for="participant in replyMagnets" :key="`magnet-${participant.id}`" class="rank-row">
              <span>{{ normalizeDisplayName(participant.name) }}</span>
              <strong class="t-mono">{{ participant.magnetScore?.toFixed(2) ?? '—' }}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-else class="page-stack">
      <article class="card section-card">
        <div class="section-copy">
          <span class="t-label">{{ copy.content }}</span>
          <h2 class="t-h2">{{ copy.contentTitle }}</h2>
          <p class="t-small section-text">{{ copy.contentText }}</p>
        </div>

        <div class="report-grid">
          <article class="subcard">
            <span class="t-label">{{ copy.sharedVocabulary }}</span>
            <div v-if="sharedVocabulary.length" class="chip-wrap">
              <span v-for="item in sharedVocabulary" :key="item.value" class="word-chip">
                {{ item.value }} <span class="t-mono chip-count">{{ formatNumber(item.count) }}</span>
              </span>
            </div>
            <EmptyState v-else :icon="MessageSquare" :title="copy.sharedVocabulary" :description="copy.noWords" />
          </article>

          <article class="subcard">
            <span class="t-label">{{ copy.uniqueWords }}</span>
            <div v-if="uniqueGroupWords.length" class="chip-wrap">
              <span v-for="item in uniqueGroupWords" :key="item.value" class="word-chip">
                {{ item.value }} <span class="t-mono chip-count">{{ formatNumber(item.count) }}</span>
              </span>
            </div>
            <EmptyState v-else :icon="MessageSquare" :title="copy.uniqueWords" :description="copy.noWords" />
          </article>
        </div>
      </article>

      <article class="card section-card">
        <div class="section-copy">
          <span class="t-label">{{ copy.signatures }}</span>
          <h2 class="t-h2">{{ copy.signatures }}</h2>
        </div>
        <div class="signature-grid">
          <div
            v-for="participant in participants.slice(0, 8)"
            :key="`signature-${participant.id}`"
            class="fact-card signature-card"
          >
            <strong>{{ normalizeDisplayName(participant.name) }}</strong>
            <div class="chip-wrap compact-chip-wrap">
              <span v-for="item in participant.topicSignature" :key="item.value" class="word-chip">
                {{ item.value }}
              </span>
            </div>
          </div>
        </div>
      </article>

      <article class="card section-card">
        <div class="section-copy">
          <span class="t-label">{{ copy.topEmoji }}</span>
          <h2 class="t-h2">{{ copy.topEmoji }}</h2>
        </div>
        <EmojiGrid :items="chat.topEmoji.slice(0, 9)" />
      </article>
    </section>
  </div>
</template>

<style scoped>
.page-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section-card,
.section-copy,
.subcard,
.fact-card,
.insight-card,
.pair-card {
  display: flex;
  flex-direction: column;
}

.section-card,
.subcard {
  gap: var(--space-4);
}

.section-copy {
  gap: var(--space-2);
}

.group-tabs-scroll {
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.group-tabs-scroll::-webkit-scrollbar {
  display: none;
}

.group-kpi-grid :deep(.metric-label) {
  display: -webkit-box;
  min-height: 2.5em;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
}

.group-kpi-grid,
.report-grid,
.facts-grid,
.pairs-grid,
.signature-grid,
.insights-grid {
  display: grid;
  gap: var(--space-4);
}

.report-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.facts-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.pairs-grid,
.signature-grid,
.insights-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.participant-bars,
.rank-list,
.connection-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.participant-bar-row,
.rank-row,
.connection-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.participant-bar-head,
.rank-row,
.connection-row,
.pair-head,
.spotlight-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.participant-bar-track {
  height: 10px;
  border-radius: 999px;
  background: var(--bg-overlay);
  overflow: hidden;
}

.participant-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 62%, white));
}

.participant-bar-fill-muted {
  background: color-mix(in srgb, var(--text-secondary) 35%, transparent);
}

.members-table-wrap {
  overflow-x: auto;
}

.members-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

.members-table th,
.members-table td {
  padding: 14px 12px;
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
  vertical-align: middle;
}

.members-table th {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.members-table tbody tr {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.members-table tbody tr:hover {
  background: color-mix(in srgb, var(--bg-elevated) 92%, transparent);
}

.member-row-active {
  background: color-mix(in srgb, var(--accent-subtle) 80%, transparent);
}

.spotlight-card {
  gap: var(--space-5);
}

.spotlight-badge {
  min-width: 180px;
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
}

.spotlight-badge,
.spotlight-explainer,
.fact-card,
.insight-card,
.pair-card {
  gap: var(--space-2);
}

.spotlight-explainer {
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
}

.pair-card {
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
}

.pair-score {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: var(--text-primary);
}

.pair-meta {
  display: grid;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: 12px;
}

.fact-card {
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
}

.fact-value {
  color: var(--text-primary);
}

.chip-wrap,
.compact-chip-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.word-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--text-primary);
}

.chip-count {
  color: var(--text-secondary);
}

.insight-card {
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--bg-elevated) 94%, transparent),
    color-mix(in srgb, var(--bg-surface) 98%, transparent)
  );
}

.connection-row,
.rank-row {
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
}

.connection-row:last-child,
.rank-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.signature-card {
  min-height: 140px;
}

@media (max-width: 960px) {
  .report-grid,
  .pairs-grid,
  .signature-grid,
  .insights-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .group-tabs-scroll :deep(.segmented) {
    min-width: 560px;
    max-width: none;
  }

  .facts-grid {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }

  .spotlight-head {
    flex-direction: column;
  }

  .spotlight-badge {
    min-width: 0;
  }

  .members-table th,
  .members-table td {
    padding: 12px 10px;
  }
}

@media (max-width: 640px) {
  .group-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 1fr;
    gap: var(--space-2);
  }

  .facts-grid > .fact-card:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
}
</style>
