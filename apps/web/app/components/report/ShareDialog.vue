<script setup lang="ts">
import { fillDailyGaps, type ReportDto, type ShareLinkDto, type ShareLinksResponse } from '@tg-analyzer/shared'
import { Download, Link, Play, Send, Users } from '../../lib/icons'

/**
 * «Поделиться»: «Итоги» first — watch them, save every frame as a 1080 × 1920 picture, or send them
 * through the system share sheet (only where the browser can share files). Under them, «По ссылке»:
 * the report as a public page and the quiz for the other side, each a second step of the same dialog.
 *
 * A phone shows a sheet with «Итоги» as one tile; desktop a dialog with the cover of «Итоги» as a
 * picture pane on the left (UiModalDialog `aside`).
 */
export type StoryIntent = 'view' | 'save' | 'share'

const props = defineProps<{ open: boolean; data: ReportDto }>()
const emit = defineEmits<{ close: []; story: [intent: StoryIntent] }>()
const { t, tc, formatDate } = useI18n()
const image = useCardImage()

const canShare = ref(false)
const step = ref<'main' | 'link' | 'quiz'>('main')
const links = ref<ShareLinksResponse | null>(null)
const name = computed(() => props.data.summary.title)
const isGroup = computed(() => Boolean(props.data.report.group))

async function loadLinks() {
  try {
    links.value = await api('GET /api/v1/reports/:chatId/links', { params: { chatId: props.data.summary.chatId } })
  } catch {
    links.value = null
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    canShare.value = image.canShareFiles()
    step.value = 'main'
    // Links are for two-person reports: a group report would show other people's names.
    if (!isGroup.value) void loadLinks()
  },
  // The dialog is loaded lazily and mounts already open: the first open must load its links too.
  { immediate: true },
)

function pick(intent: StoryIntent) {
  emit('close')
  emit('story', intent)
}

const linkOf = (kind: ShareLinkDto['kind']) => links.value?.links.find((link) => link.kind === kind) ?? null
const reportLink = computed(() => linkOf('report'))
const quizLink = computed(() => linkOf('quiz'))
const quizOpen = computed(() => Boolean(links.value?.quizAvailable || quizLink.value))
const reportStatus = computed(() => {
  const link = reportLink.value
  if (!link) return t('share.link.off')
  return link.expiresAt
    ? t('share.link.onUntil', { date: formatDate(link.expiresAt, { day: 'numeric', month: 'long' }) })
    : t('share.link.on')
})
const quizStatus = computed(() => {
  const link = quizLink.value
  if (!link)
    return links.value?.quizAvailable ? t('share.quiz.note', { name: name.value }) : t('share.quiz.unavailable')
  if (!link.result) return t('share.quiz.waiting')
  return link.result.score === null
    ? t('share.quiz.hidden')
    : t('share.quiz.score', { score: link.result.score, total: link.result.total })
})

/** A step made, replaced or deleted its link: the list follows without a reload. */
function updated(link: ShareLinkDto | null, kind: ShareLinkDto['kind']) {
  if (!links.value) return
  links.value = {
    ...links.value,
    links: [...links.value.links.filter((item) => item.kind !== kind), ...(link ? [link] : [])],
  }
}

const days = computed(() => fillDailyGaps(props.data.report.activity.daily))
/** «4 800 сообщений за 208 дней»: the cover's one line. */
const coverMeta = computed(() =>
  t('share.coverMeta', {
    messages: tc('common.messagesCount', props.data.report.totals.messages),
    days: tc('insight.days', days.value.length),
  }),
)
const frames = computed(() => (isGroup.value ? 5 : 4))
const title = computed(() =>
  step.value === 'link' ? t('share.link.title') : step.value === 'quiz' ? t('share.quiz.short') : t('share.open'),
)
</script>

<template>
  <UiModalDialog
    :open="open"
    size="lg"
    :title="title"
    :back="step !== 'main'"
    @back="step = 'main'"
    @close="emit('close')"
  >
    <!-- Desktop: the cover of «Итоги» as it opens, and the way in. -->
    <template #aside>
      <div class="cover">
        <span class="cover__segments" aria-hidden="true">
          <i v-for="index in frames" :key="index" :class="{ 'is-on': index === 1 }" />
        </span>
        <Pulse class="cover__pulse" :data="days" :bars="28" :height="28" />
        <p class="cover__name">{{ name }}</p>
        <p class="cover__meta">{{ coverMeta }}</p>
        <UiButton class="cover__watch" variant="poster" :icon="Play" block @click="pick('view')">
          {{ t('share.watch') }}
        </UiButton>
      </div>
    </template>

    <div v-if="step === 'main'" class="share">
      <!-- A phone: «Итоги» as one tile. -->
      <div class="feature">
        <span class="feature__thumb" aria-hidden="true">
          <span class="cover__segments">
            <i v-for="index in frames" :key="index" :class="{ 'is-on': index === 1 }" />
          </span>
          <b class="feature__thumb-name">{{ name }}</b>
          <Pulse :data="days" :bars="12" :height="8" />
        </span>
        <span class="feature__copy">
          <b class="feature__title">{{ t('share.title', { name }) }}</b>
          <span class="feature__text">{{ t(isGroup ? 'share.ledeGroup' : 'share.lede') }}</span>
          <UiButton class="feature__watch" variant="poster" size="sm" :icon="Play" @click="pick('view')">
            {{ t('share.watchShort') }}
          </UiButton>
        </span>
      </div>

      <UiGroup>
        <UiListRow as="button" :title="t('share.save')" :subtitle="tc('share.saveNote', frames)" @click="pick('save')">
          <template #leading><Download aria-hidden="true" /></template>
        </UiListRow>
        <UiListRow
          v-if="canShare"
          as="button"
          :title="t('share.send')"
          :subtitle="t('share.sendNote')"
          @click="pick('share')"
        >
          <template #leading><Send aria-hidden="true" /></template>
        </UiListRow>
      </UiGroup>

      <UiGroup v-if="!isGroup && links" :header="t('share.byLink')">
        <UiListRow as="button" chevron :title="t('share.link.title')" :subtitle="reportStatus" @click="step = 'link'">
          <template #leading><Link aria-hidden="true" /></template>
        </UiListRow>
        <UiListRow
          as="button"
          :chevron="quizOpen"
          :disabled="!quizOpen"
          :title="t('share.quiz.short')"
          :subtitle="quizStatus"
          @click="step = 'quiz'"
        >
          <template #leading><Users aria-hidden="true" /></template>
        </UiListRow>
      </UiGroup>
    </div>

    <ShareLinkStep v-else-if="step === 'link'" :data="data" :link="reportLink" @update="updated($event, 'report')" />
    <ShareQuizStep
      v-else
      :chat-id="data.summary.chatId"
      :name="name"
      :link="quizLink"
      :questions="data.derived.quiz"
      @update="updated($event, 'quiz')"
    />
  </UiModalDialog>
</template>

<style scoped>
.share {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

/* The cover of «Итоги»: the person's poster, the frame marks at the top, the way in at the foot. */
.cover {
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: calc(var(--space-12) * 5);
  min-height: calc(var(--space-12) * 8);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--poster);
  color: var(--on-poster);
}

.cover__segments {
  display: flex;
  gap: var(--space-1);
}

.cover__segments i {
  flex: 1;
  height: var(--space-1);
  border-radius: var(--radius-full);
  background: var(--on-poster-faint);
}

.cover__segments i.is-on {
  background: var(--on-poster);
}

.cover__pulse {
  margin-top: auto;
}

.cover__name {
  display: -webkit-box;
  overflow: hidden;
  padding-top: var(--space-4);
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.cover__meta {
  color: var(--on-poster-muted);
  font: var(--text-small);
}

.cover__watch {
  margin-top: auto;
}

.feature {
  display: none;
}

/* A phone: «Итоги» is a tile of the sheet — a small cover, what it is, «Смотреть». */
@media (max-width: 640px) {
  .feature {
    --pulse-you: var(--on-poster);
    --pulse-them: var(--on-them);
    display: flex;
    align-items: stretch;
    gap: var(--space-4);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--poster);
    color: var(--on-poster);
  }

  .feature__thumb {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--space-1);
    width: calc(var(--space-16) + var(--space-2));
    min-height: calc(var(--space-16) * 2);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    box-shadow: var(--ring-on-poster);
  }

  .feature__thumb-name {
    overflow: hidden;
    margin-top: auto;
    font: var(--text-caption);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .feature__copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: var(--space-1);
    min-width: 0;
  }

  .feature__title {
    font: var(--text-h3);
    letter-spacing: var(--tracking-h3);
  }

  .feature__text {
    color: var(--on-poster-muted);
    font: var(--text-small);
  }

  .feature__watch {
    margin-top: var(--space-3);
  }
}
</style>
