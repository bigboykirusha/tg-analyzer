<script setup lang="ts">
import type { ContactStatsDto, PeopleOverviewDto } from '@tg-analyzer/shared'
import { api } from '../composables/useApi'
import { RefreshCw, Users } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

/** While the overview is being built the page checks back this often. */
const POLL_MS = 3000
/** Below this many replies a typical reply time is noise. */
const MIN_REPLIES = 5
const LIST_SIZE = 6

const { t, tc, formatDuration, formatPercent, formatRelative } = useI18n()
useSeoMeta({ title: () => t('nav.people') })

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const analysis = useAnalysis()
const toast = useToast()
const errorMessage = useErrorMessage()

const overview = ref<PeopleOverviewDto | null>(null)
const loadError = ref<unknown>(null)
const refreshing = ref(false)
let poll: ReturnType<typeof setTimeout> | undefined

async function load() {
  clearTimeout(poll)
  try {
    overview.value = await api('GET /api/v1/people')
    loadError.value = null
  } catch (error) {
    loadError.value = error
  }
  if (overview.value?.status === 'running') poll = setTimeout(load, POLL_MS)
}

async function refresh() {
  refreshing.value = true
  try {
    overview.value = await api('POST /api/v1/people/refresh')
    if (overview.value.status === 'running') poll = setTimeout(load, POLL_MS)
  } catch (error) {
    toast.error(t('people.refreshError'), errorMessage(error))
  } finally {
    refreshing.value = false
  }
}

onMounted(() => {
  void load()
  void workspace.loadReports().catch(() => undefined)
})
onBeforeUnmount(() => clearTimeout(poll))

const contacts = computed(() => overview.value?.contacts ?? [])
const running = computed(() => overview.value?.status === 'running')
const reportIds = computed(() => new Set(workspace.reports.map((report) => report.chatId)))

interface Row {
  contact: ContactStatsDto
  value: string
  sub: string
}

const closest = computed<Row[]>(() =>
  contacts.value
    .filter((contact) => contact.last30 > 0)
    .slice(0, LIST_SIZE)
    .map((contact) => ({
      contact,
      value: tc('people.messages', contact.last30),
      sub: t('people.closestSub', { total: contact.messages90 }),
    })),
)

/** «+80%» or «new» compared with the month before. */
function change(contact: ContactStatsDto) {
  if (!contact.previous30) return t('people.new')
  const delta = Math.round(((contact.last30 - contact.previous30) / contact.previous30) * 100)
  return `${delta > 0 ? '+' : ''}${delta}%`
}

const growing = computed<Row[]>(() =>
  contacts.value
    .filter((c) => c.last30 >= 10 && c.last30 >= c.previous30 * 1.5)
    .sort((a, b) => b.last30 - b.previous30 - (a.last30 - a.previous30))
    .slice(0, LIST_SIZE)
    .map((contact) => ({
      contact,
      value: change(contact),
      sub: t('people.changeSub', { now: contact.last30, before: contact.previous30 }),
    })),
)

const fading = computed<Row[]>(() =>
  contacts.value
    .filter((c) => c.previous30 >= 15 && c.last30 <= c.previous30 * 0.4)
    .sort((a, b) => b.previous30 - b.last30 - (a.previous30 - a.last30))
    .slice(0, LIST_SIZE)
    .map((contact) => ({
      contact,
      value: change(contact),
      sub: t('people.changeSub', { now: contact.last30, before: contact.previous30 }),
    })),
)

const fastest = computed<Row[]>(() =>
  contacts.value
    .filter((c) => c.medianTheirsSec !== null && c.theirsSamples >= MIN_REPLIES)
    .sort((a, b) => (a.medianTheirsSec ?? 0) - (b.medianTheirsSec ?? 0))
    .slice(0, LIST_SIZE)
    .map((contact) => ({
      contact,
      value: formatDuration(contact.medianTheirsSec),
      sub: t('people.fastestSub', { mine: formatDuration(contact.medianMineSec) }),
    })),
)

const youStart = computed<Row[]>(() =>
  contacts.value
    .filter((c) => c.conversations >= 4 && (c.iWriteFirstPct ?? 0) >= 70)
    .sort((a, b) => (b.iWriteFirstPct ?? 0) - (a.iWriteFirstPct ?? 0))
    .slice(0, LIST_SIZE)
    .map((contact) => ({
      contact,
      value: formatPercent(contact.iWriteFirstPct),
      sub: tc('people.conversations', contact.conversations),
    })),
)

const sections = computed(() =>
  [
    { key: 'closest', title: t('people.closest'), text: t('people.closestText'), rows: closest.value },
    { key: 'growing', title: t('people.growing'), text: t('people.growingText'), rows: growing.value },
    { key: 'fading', title: t('people.fading'), text: t('people.fadingText'), rows: fading.value },
    { key: 'fastest', title: t('people.fastest'), text: t('people.fastestText'), rows: fastest.value },
    { key: 'youStart', title: t('people.youStart'), text: t('people.youStartText'), rows: youStart.value },
  ].filter((section) => section.rows.length),
)

const startingChatId = ref<string | null>(null)
async function openOrAnalyse(contact: ContactStatsDto) {
  if (reportIds.value.has(contact.chatId)) return navigateTo(`/chat/${contact.chatId}`)
  startingChatId.value = contact.chatId
  try {
    await analysis.startAnalysis(contact.chatId, contact.title)
    toast.info(t('people.analysisStarted'), t('people.analysisStartedText', { chat: contact.title }))
  } catch (error) {
    toast.error(t('analysis.startError'), errorMessage(error))
  } finally {
    startingChatId.value = null
  }
}
</script>

<template>
  <UiPageContainer>
    <div class="stack stack--lg">
      <header class="people-header">
        <div class="section-copy">
          <h1 class="t-h1">{{ t('people.title') }}</h1>
          <p class="t-body">{{ t('people.subtitle') }}</p>
        </div>
        <UiButton
          v-if="overview && overview.status !== 'empty'"
          variant="ghost"
          size="sm"
          :icon="RefreshCw"
          :loading="running || refreshing"
          :disabled="!auth.telegramSessionActive"
          @click="refresh"
        >
          {{ running ? t('people.updating') : t('people.refresh') }}
        </UiButton>
      </header>

      <p v-if="overview?.computedAt && !running" class="t-small t-muted people-updated">
        {{ t('people.updated', { time: formatRelative(overview.computedAt) }) }}
      </p>

      <section v-if="running" class="panel people-progress" aria-live="polite">
        <strong>{{ t('people.collecting') }}</strong>
        <span class="t-small t-muted">
          {{
            overview?.totalChats
              ? t('people.progress', { done: overview.scannedChats, total: overview.totalChats })
              : t('people.preparing')
          }}
        </span>
        <div
          class="people-progress__track"
          role="progressbar"
          :aria-valuenow="
            overview?.totalChats ? Math.round((overview.scannedChats / overview.totalChats) * 100) : undefined
          "
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="t('people.collecting')"
        >
          <span
            :style="{
              width: overview?.totalChats
                ? `${Math.max(4, (overview.scannedChats / overview.totalChats) * 100)}%`
                : '4%',
            }"
          />
        </div>
      </section>

      <UiEmptyState
        v-if="loadError && !overview"
        tone="danger"
        :title="t('people.loadError')"
        :description="errorMessage(loadError)"
      >
        <template #action>
          <UiButton variant="secondary" @click="load">{{ t('common.retry') }}</UiButton>
        </template>
      </UiEmptyState>

      <UiEmptyState
        v-else-if="overview && !running && !sections.length"
        :icon="Users"
        :title="overview.status === 'failed' ? t('people.failedTitle') : t('people.emptyTitle')"
        :description="overview.status === 'failed' ? t('people.failedText') : t('people.emptyText')"
      >
        <template v-if="overview.status === 'failed'" #action>
          <UiButton variant="secondary" :loading="refreshing" @click="refresh">{{ t('common.retry') }}</UiButton>
        </template>
      </UiEmptyState>

      <div v-else class="people-grid">
        <section v-for="section in sections" :key="section.key" class="card people-section">
          <header class="people-section__head">
            <h2 class="t-title">{{ section.title }}</h2>
            <p class="t-small t-muted">{{ section.text }}</p>
          </header>
          <ul class="people-list">
            <li v-for="row in section.rows" :key="row.contact.chatId">
              <button
                type="button"
                class="person"
                :disabled="startingChatId !== null"
                @click="openOrAnalyse(row.contact)"
              >
                <ChatAvatar
                  :chat-id="row.contact.chatId"
                  :title="row.contact.title"
                  :has-avatar="row.contact.hasAvatar"
                  size="sm"
                />
                <span class="person__copy">
                  <span class="person__name">{{ row.contact.title }}</span>
                  <span class="person__sub">
                    {{ row.sub }} ·
                    {{ reportIds.has(row.contact.chatId) ? t('people.openReport') : t('people.buildReport') }}
                  </span>
                </span>
                <span class="person__value">{{ row.value }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </UiPageContainer>
</template>

<style scoped>
.people-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  padding-inline: var(--space-1);
}

.people-updated {
  margin-top: calc(var(--space-4) * -1);
  padding-inline: var(--space-1);
}

.people-progress {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-5);
}

.people-progress__track {
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.people-progress__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width var(--transition-slow);
}

.people-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
}

.people-section {
  display: grid;
  align-content: start;
  gap: var(--space-4);
  min-width: 0;
}

.people-section__head {
  display: grid;
  gap: var(--space-1);
}

.people-list {
  display: grid;
  gap: var(--space-1);
  margin-inline: calc(var(--space-3) * -1);
  list-style: none;
}

.person {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 56px;
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition: background-color var(--transition-fast);
}

@media (hover: hover) {
  .person:hover:not(:disabled) {
    background: var(--hover);
  }
}

.person:active:not(:disabled) {
  background: var(--pressed);
}

.person:disabled {
  cursor: progress;
}

.person__copy {
  display: grid;
  flex: 1 1 auto;
  min-width: 0;
}

.person__name,
.person__sub {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person__name {
  font: var(--text-ui);
}

.person__sub {
  color: var(--text-muted);
  font: var(--text-small);
}

.person__value {
  flex: 0 0 auto;
  font: var(--text-mono);
  font-weight: 600;
}

@media (max-width: 900px) {
  .people-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .people-header {
    padding-inline: var(--space-2);
  }
}
</style>
