<script setup lang="ts">
import { fillDailyGaps, type ReportDto, type ShareLinkDto, type ShareLinksResponse } from '@tg-analyzer/shared'
import { ArrowLeft, ChevronRight, CircleHelp, Download, Link, Lock, Play, Share2 } from '../../lib/icons'
import type { StorySlideModel } from './StorySlide.vue'

/**
 * «Поделиться»: the recap («Итоги») with its cover — the real slide component, scaled down — and
 * what you can do with it: watch it, save every slide as a 1080×1920 picture, or send them through
 * the phone's share sheet (only where the browser can share files). Under them, «По ссылке»: the
 * report as a public page and the quiz for the other side; each opens a second step in the same
 * dialog. On phones it is the same content as a floating sheet (`UiModalDialog`).
 */
export type StoryIntent = 'view' | 'save' | 'share'

const props = defineProps<{ open: boolean; data: ReportDto }>()
const emit = defineEmits<{ close: []; story: [intent: StoryIntent] }>()
const { t, tc, formatNumber, formatDate, formatPeriod } = useI18n()
const image = useCardImage()
const auth = useAuthStore()

const canShare = ref(false)
const step = ref<'main' | 'link' | 'quiz'>('main')
const links = ref<ShareLinksResponse | null>(null)
/** Links are for two-person reports: a group report would show other people's names. */
const linkable = computed(() => !props.data.report.group)

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
    if (linkable.value) void loadLinks()
  },
)

function pick(intent: StoryIntent) {
  emit('close')
  emit('story', intent)
}

const linkOf = (kind: ShareLinkDto['kind']) => links.value?.links.find((link) => link.kind === kind) ?? null
const reportLink = computed(() => linkOf('report'))
const quizLink = computed(() => linkOf('quiz'))
const quizOpen = computed(() => Boolean(links.value?.quizAvailable || quizLink.value))
const until = (link: ShareLinkDto) =>
  link.expiresAt ? t('share.until', { date: formatDate(link.expiresAt, { day: 'numeric', month: 'long' }) }) : ''
const reportStatus = computed(() => {
  const link = reportLink.value
  return link ? [t('share.link.on'), until(link)].filter(Boolean).join(' · ') : t('share.link.off')
})
const quizStatus = computed(() => {
  const link = quizLink.value
  if (!link) return links.value?.quizAvailable ? t('share.quiz.note') : t('share.quiz.unavailable')
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

/** The cover of «Итоги» as it opens: who, the total and the pulse of the whole chat. */
const isGroup = computed(() => props.data.summary.type === 'group')
const cover = computed(() => {
  const { report, summary } = props.data
  const me = auth.user?.firstName?.trim() || auth.user?.username || t('story.you')
  const { firstMessageAt, lastMessageAt } = report.period
  const slide: StorySlideModel = {
    key: 'cover',
    theme: 1,
    durationMs: 0,
    kicker: t(isGroup.value ? 'story.volumeKickerGroup' : 'story.volumeKicker'),
    title: formatNumber(report.totals.messages),
    sub: tc('story.messagesWord', report.totals.messages),
    blocks: [{ kind: 'pulse', label: t('story.pulseLabel'), days: fillDailyGaps(report.activity.daily) }],
  }
  return {
    slide,
    people: isGroup.value
      ? [{ name: summary.title, avatar: null }]
      : [
          { name: me, avatar: null },
          { name: summary.title, avatar: null },
        ],
    heading: isGroup.value ? summary.title : `${me} & ${summary.title}`,
    headingSub:
      isGroup.value && report.group
        ? tc('story.members', report.group.participants.length)
        : firstMessageAt && lastMessageAt
          ? formatPeriod(firstMessageAt, lastMessageAt, true)
          : null,
  }
})

const title = computed(() =>
  step.value === 'link'
    ? t('share.link.title')
    : step.value === 'quiz'
      ? t('share.quiz.title', { name: props.data.summary.title })
      : t('share.title', { name: props.data.summary.title }),
)
</script>

<template>
  <UiModalDialog :open="open" size="md" :title="title" @close="emit('close')">
    <template #header>
      <div class="share-head">
        <UiIconButton
          v-if="step !== 'main'"
          :icon="ArrowLeft"
          :label="t('nav.back')"
          variant="secondary"
          size="sm"
          @click="step = 'main'"
        />
        <h2 class="t-h2">{{ title }}</h2>
      </div>
    </template>
    <div v-if="step === 'main'" class="share">
      <div class="share__preview" aria-hidden="true">
        <StorySlide
          :slide="cover.slide"
          :people="cover.people"
          :heading="cover.heading"
          :heading-sub="cover.headingSub"
          still
        />
      </div>
      <div class="share__intro">
        <p class="share__lede">{{ t('share.lede') }}</p>
        <UiButton variant="primary" :icon="Play" block @click="pick('view')">{{ t('share.watch') }}</UiButton>
      </div>
      <div class="share__main">
        <div class="share__list">
          <UiListRow
            as="button"
            size="md"
            :title="t('share.save')"
            :subtitle="t('share.saveNote')"
            @click="pick('save')"
          >
            <template #leading>
              <span class="share__icon"><Download aria-hidden="true" /></span>
            </template>
          </UiListRow>
          <UiListRow
            v-if="canShare"
            as="button"
            size="md"
            divider
            :title="t('share.send')"
            :subtitle="t('share.sendNote')"
            @click="pick('share')"
          >
            <template #leading>
              <span class="share__icon"><Share2 aria-hidden="true" /></span>
            </template>
          </UiListRow>
        </div>
        <template v-if="linkable && links">
          <p class="share__caption">{{ t('share.byLink') }}</p>
          <div class="share__list">
            <UiListRow
              as="button"
              size="md"
              :title="t('share.link.title')"
              :subtitle="reportStatus"
              @click="step = 'link'"
            >
              <template #leading>
                <span class="share__icon"><Link aria-hidden="true" /></span>
              </template>
              <template #trailing><ChevronRight aria-hidden="true" /></template>
            </UiListRow>
            <UiListRow
              as="button"
              size="md"
              divider
              :disabled="!quizOpen"
              :title="t('share.quiz.title', { name: data.summary.title })"
              :subtitle="quizStatus"
              @click="step = 'quiz'"
            >
              <template #leading>
                <span class="share__icon"><CircleHelp aria-hidden="true" /></span>
              </template>
              <template v-if="quizOpen" #trailing><ChevronRight aria-hidden="true" /></template>
            </UiListRow>
          </div>
          <p class="share__secure"><Lock aria-hidden="true" />{{ t('share.secure') }}</p>
        </template>
      </div>
    </div>
    <div v-else class="share-step">
      <ShareLinkStep
        v-if="step === 'link'"
        :chat-id="data.summary.chatId"
        :name="data.summary.title"
        :link="reportLink"
        @update="updated($event, 'report')"
      />
      <ShareQuizStep
        v-else
        :chat-id="data.summary.chatId"
        :name="data.summary.title"
        :link="quizLink"
        :questions="data.derived.quiz"
        @update="updated($event, 'quiz')"
      />
    </div>
  </UiModalDialog>
</template>

<style scoped>
/*
 * The cover on the left, the actions on the right; on phones the cover sits beside the lede and
 * «Смотреть итоги», and the lists take the full width under them.
 */
.share {
  /* The cover is a 9:16 thumbnail: wide enough to read the total, small beside the actions. */
  --share-preview: calc(var(--space-20) * 2);

  display: grid;
  grid-template-columns: var(--share-preview) minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'preview intro'
    'preview main';
  gap: var(--space-4) var(--space-6);
}

/* The real first slide, in its own poster colours (the same in both themes). */
.share__preview {
  grid-area: preview;
  align-self: start;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  border-radius: var(--radius-md);
  box-shadow: var(--ring-hairline);
}

.share__intro {
  display: grid;
  grid-area: intro;
  gap: var(--space-4);
}

.share__lede {
  color: var(--text-muted);
  font: var(--text-small);
  text-wrap: pretty;
}

.share__main {
  display: grid;
  grid-area: main;
  align-content: start;
  gap: var(--space-3);
}

/* Grouped rows in one well, split by hairlines. */
.share__list {
  --row-radius: 0;
  --row-px: var(--space-4);

  display: grid;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--fill-raised);
}

/* Statuses are sentences: they wrap instead of losing their end. */
.share__list :deep(.list-row__subtitle) {
  white-space: normal;
}

.share__icon {
  display: grid;
  place-items: center;
  width: var(--control-xs);
  height: var(--control-xs);
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  color: var(--text);
  --icon-size: var(--icon-sm);
}

/* «По ссылке»: the caption of the second group. */
.share__caption {
  margin-top: var(--space-2);
  padding-inline: var(--space-1);
  color: var(--text-muted);
  font: var(--text-caption);
}

.share__secure {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding-inline: var(--space-1);
  color: var(--text-muted);
  font: var(--text-caption);
  --icon-size: var(--icon-sm);
}

/* A second step: «назад» beside its title. */
.share-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.share-step {
  display: grid;
  gap: var(--space-4);
}

@media (max-width: 640px) {
  .share {
    --share-preview: calc(var(--space-16) + var(--space-10));

    grid-template-rows: auto auto;
    grid-template-areas:
      'preview intro'
      'main main';
    column-gap: var(--space-4);
  }

  .share__intro {
    align-self: end;
  }
}
</style>
