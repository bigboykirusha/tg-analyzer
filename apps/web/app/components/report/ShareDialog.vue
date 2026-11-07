<script setup lang="ts">
import type { ReportDto, ShareLinkDto, ShareLinksResponse } from '@tg-analyzer/shared'
import { ArrowLeft, ChevronRight, CircleHelp, Download, Link, Lock, Play, Share2 } from '../../lib/icons'

/**
 * «Поделиться»: the recap («Итоги») with a preview of its first slide on the left and what you can
 * do with it on the right — watch it, save every slide as a 1080×1920 picture, or send them through
 * the phone's share sheet (only where the browser can share files). Under a line, «По ссылке»: the
 * report as a public page and the quiz for the other side; each opens a second step in the same
 * dialog. On phones it is the same content as a floating sheet (`UiModalDialog`).
 */
export type StoryIntent = 'view' | 'save' | 'share'

const props = defineProps<{ open: boolean; data: ReportDto }>()
const emit = defineEmits<{ close: []; story: [intent: StoryIntent] }>()
const { t, tc, formatNumber, formatDate } = useI18n()
const image = useCardImage()

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
    <div v-if="step === 'main'" class="share">
      <div class="share__preview" aria-hidden="true">
        <span class="share__bars"><i class="is-on" /><i /><i /><i /><i /><i /></span>
        <span class="share__slide">
          <small>{{ t('share.slideWith', { name: data.summary.title }) }}</small>
          <b class="t-num">{{ formatNumber(data.report.totals.messages) }}</b>
          <small>{{ tc('share.messages', data.report.totals.messages) }}</small>
        </span>
      </div>
      <div class="share__actions">
        <p class="share__lede">{{ t('share.lede') }}</p>
        <UiButton variant="primary" :icon="Play" block @click="pick('view')">{{ t('share.watch') }}</UiButton>
        <button type="button" class="share__row" @click="pick('save')">
          <span class="share__icon"><Download aria-hidden="true" /></span>
          <span
            >{{ t('share.save') }}<small>{{ t('share.saveNote') }}</small></span
          >
        </button>
        <button v-if="canShare" type="button" class="share__row" @click="pick('share')">
          <span class="share__icon"><Share2 aria-hidden="true" /></span>
          <span
            >{{ t('share.send') }}<small>{{ t('share.sendNote') }}</small></span
          >
        </button>
        <template v-if="linkable && links">
          <p class="share__divider">{{ t('share.byLink') }}</p>
          <button type="button" class="share__row" @click="step = 'link'">
            <span class="share__icon"><Link aria-hidden="true" /></span>
            <span class="share__copy"
              >{{ t('share.link.title') }}<small>{{ reportStatus }}</small></span
            >
            <ChevronRight aria-hidden="true" class="share__chevron" />
          </button>
          <button type="button" class="share__row" :disabled="!quizOpen" @click="step = 'quiz'">
            <span class="share__icon"><CircleHelp aria-hidden="true" /></span>
            <span class="share__copy"
              >{{ t('share.quiz.title', { name: data.summary.title }) }}<small>{{ quizStatus }}</small></span
            >
            <ChevronRight v-if="quizOpen" aria-hidden="true" class="share__chevron" />
          </button>
          <p class="share__secure"><Lock aria-hidden="true" />{{ t('share.secure') }}</p>
        </template>
      </div>
    </div>
    <div v-else class="share-step">
      <button type="button" class="share-step__back" :aria-label="t('nav.back')" @click="step = 'main'">
        <ArrowLeft aria-hidden="true" />
      </button>
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
.share {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: var(--space-5);
}

/* The first slide of «Итоги», in its own poster colours (the same in both themes). */
.share__preview {
  display: grid;
  align-content: space-between;
  aspect-ratio: 9 / 16;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--story-gradient-1);
  color: var(--story-ink);
}

.share__bars {
  display: flex;
  gap: 3px;
}

.share__bars i {
  flex: 1;
  height: 2px;
  border-radius: var(--radius-full);
  background: var(--story-track);
}

.share__bars .is-on {
  background: var(--story-ink);
}

.share__slide {
  display: grid;
  gap: var(--space-1);
  font: var(--text-caption);
}

.share__slide small {
  color: var(--story-ink-muted);
  font: inherit;
}

.share__slide b {
  font: var(--text-h1);
  letter-spacing: var(--tracking-figure);
}

.share__actions {
  display: grid;
  align-content: start;
  gap: var(--space-4);
}

.share__lede {
  color: var(--text-muted);
  font: var(--text-small);
}

.share__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--hit-min);
  padding: var(--space-2) 0;
  border: 0;
  background: none;
  color: var(--text);
  font: var(--text-ui);
  text-align: left;
  cursor: pointer;
}

.share__row small {
  display: block;
  color: var(--text-muted);
  font: var(--text-caption);
}

.share__row:disabled {
  cursor: default;
  opacity: 0.6;
}

.share__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--control-sm);
  height: var(--control-sm);
  border-radius: var(--radius-full);
  background: var(--fill-raised);
}

.share__copy {
  flex: 1;
  min-width: 0;
}

.share__chevron {
  color: var(--text-muted);
}

/* «По ссылке»: a caption on a hairline between the recap and the links. */
.share__divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-muted);
  font: var(--text-caption);
}

.share__divider::after {
  flex: 1;
  border-top: 1px solid var(--border);
  content: '';
}

.share__secure {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-caption);
}

.share-step {
  display: grid;
  gap: var(--space-4);
}

.share-step__back {
  display: grid;
  place-items: center;
  width: var(--control-sm);
  height: var(--control-sm);
  border: 0;
  border-radius: var(--radius-full);
  background: var(--fill-raised);
  color: var(--text);
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .share__row:not(:disabled):hover .share__icon,
  .share-step__back:hover {
    background: var(--fill-hover);
  }
}

@media (max-width: 640px) {
  .share {
    grid-template-columns: minmax(0, 1fr);
  }

  .share__preview {
    width: 120px;
  }
}
</style>
