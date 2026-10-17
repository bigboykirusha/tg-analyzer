<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { ChevronLeft, ChevronRight, Download, Share2, X } from '../../lib/icons'

/**
 * «Итоги»: the report as vertical 9:16 story slides, in the spirit of
 * Spotify Wrapped. Each slide can be saved as a 1080×1920 PNG or shared
 * through the phone's share sheet. The other person's name is hidden
 * unless the user turns it on.
 */
const props = defineProps<{ open: boolean; data: ReportDto }>()
const emit = defineEmits<{ close: [] }>()

const { t, tc, formatNumber, formatPercent, formatDuration, formatDay } = useI18n()
const toast = useToast()
const image = useCardImage()

type Theme = 'accent' | 'ink' | 'paper'
interface Slide {
  key: string
  theme: Theme
  kicker: string
  big: string
  sub?: string
  /** Your share 0–100 for a split bar. */
  split?: number
}

const index = ref(0)
const showName = ref(false)
const slideRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const open = toRef(props, 'open')
const canShare = ref(false)

useBodyScrollLock(open)
useFocusTrap(panelRef, open, { onEscape: () => emit('close') })

const LONG_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
const DAY_MONTH: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }

const slides = computed<Slide[]>(() => {
  const { report, summary } = props.data
  const isGroup = summary.type === 'group'
  const list: Slide[] = []
  const { firstMessageAt, lastMessageAt } = report.period

  list.push({
    key: 'intro',
    theme: 'accent',
    kicker: t('story.kicker'),
    big: showName.value ? t('story.introNamed', { name: summary.title }) : t('story.intro'),
    sub:
      firstMessageAt && lastMessageAt
        ? `${formatDay(firstMessageAt.slice(0, 10), DAY_MONTH)} — ${formatDay(lastMessageAt.slice(0, 10), LONG_DATE)}`
        : undefined,
  })

  list.push({
    key: 'messages',
    theme: 'ink',
    kicker: t('story.messagesKicker'),
    big: formatNumber(report.totals.messages),
    sub: t('story.messagesSub', { days: report.facts.activeDays }),
  })

  if (report.totals.messages) {
    const mine = (report.totals.sent / report.totals.messages) * 100
    list.push({
      key: 'balance',
      theme: 'paper',
      kicker: t('story.balanceKicker'),
      big: formatPercent(mine),
      sub: isGroup ? t('story.balanceGroup') : t('story.balanceSub', { theirs: formatPercent(100 - mine) }),
      split: Math.round(mine),
    })
  }

  const hourly = report.activity.hourly
  const peakHour = hourly.reduce((best, value, hour) => (value.total > (hourly[best]?.total ?? 0) ? hour : best), 0)
  if (hourly[peakHour]?.total) {
    const weekday = report.activity.weekday
    const busiest = weekday.reduce((best, value, day) => (value.total > (weekday[best]?.total ?? 0) ? day : best), 0)
    list.push({
      key: 'peak',
      theme: 'accent',
      kicker: t('story.peakKicker'),
      big: `${String(peakHour).padStart(2, '0')}:00`,
      sub: t('story.peakSub', { day: t('chart.weekdaysLong').split(',')[busiest] ?? '' }),
    })
  }

  const { medianMineSec, medianTheirsSec } = report.responses
  if (!isGroup && medianTheirsSec !== null) {
    list.push({
      key: 'speed',
      theme: 'ink',
      kicker: t('story.speedKicker'),
      big: formatDuration(medianTheirsSec),
      sub:
        medianMineSec === null ? t('story.speedSubOnly') : t('story.speedSub', { mine: formatDuration(medianMineSec) }),
    })
  }

  const streak = report.facts.maxStreak
  if (streak.days >= 3 && streak.startDate && streak.endDate) {
    list.push({
      key: 'streak',
      theme: 'paper',
      kicker: t('story.streakKicker'),
      big: tc('report.highlights.days', streak.days),
      sub: `${formatDay(streak.startDate, DAY_MONTH)} — ${formatDay(streak.endDate, LONG_DATE)}`,
    })
  }

  const longest = [...report.sessions.highlights].sort((a, b) => b.durationSec - a.durationSec)[0]
  if (longest && longest.durationSec >= 60) {
    list.push({
      key: 'talk',
      theme: 'accent',
      kicker: t('story.talkKicker'),
      big: formatDuration(longest.durationSec),
      sub: `${formatDay(longest.startedAt.slice(0, 10), LONG_DATE)} · ${tc('common.messagesCount', longest.totalMessages)}`,
    })
  }

  const words = isGroup ? report.vocabulary.topWords : report.vocabulary.topWordsBySender.mine
  if (words.length) {
    const theirs = report.vocabulary.topWordsBySender.theirs[0]?.value
    list.push({
      key: 'words',
      theme: 'ink',
      kicker: isGroup ? t('story.wordsGroupKicker') : t('story.wordsKicker'),
      big: words
        .slice(0, 3)
        .map((item) => `«${item.value}»`)
        .join('\n'),
      sub: !isGroup && theirs ? t('story.wordsSub', { word: theirs }) : undefined,
    })
  }

  const emoji = isGroup ? report.vocabulary.topEmoji : report.vocabulary.topEmojiBySender.mine
  if (emoji.length) {
    list.push({
      key: 'emoji',
      theme: 'paper',
      kicker: t('story.emojiKicker'),
      big: emoji
        .slice(0, 3)
        .map((item) => item.value)
        .join(' '),
      sub: tc('story.emojiSub', emoji[0]!.count),
    })
  }

  list.push({
    key: 'outro',
    theme: 'accent',
    kicker: t('story.outroKicker'),
    big: 'TG Analyzer',
    sub: t('story.outroSub'),
  })
  return list
})

const slide = computed(() => slides.value[Math.min(index.value, slides.value.length - 1)]!)

function go(step: 1 | -1) {
  index.value = Math.min(Math.max(index.value + step, 0), slides.value.length - 1)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') go(1)
  else if (event.key === 'ArrowLeft') go(-1)
}

/** Tapping the left third goes back, the rest goes forward, like stories. */
function onTap(event: MouseEvent) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  go(event.clientX - box.left < box.width / 3 ? -1 : 1)
}

async function renderCurrent() {
  await nextTick()
  if (!slideRef.value) throw new Error('No slide')
  return image.render(slideRef.value)
}

async function saveCurrent() {
  try {
    await image.run(async () => image.download(await renderCurrent(), `tg-analyzer-${slide.value.key}.png`))
  } catch {
    toast.error(t('story.saveError'))
  }
}

async function shareAll() {
  const start = index.value
  try {
    await image.run(async () => {
      const files: File[] = []
      for (let position = 0; position < slides.value.length; position += 1) {
        index.value = position
        const blob = await renderCurrent()
        files.push(new File([blob], `tg-analyzer-${position + 1}.png`, { type: 'image/png' }))
      }
      index.value = start
      if (canShare.value) await image.share(files)
      else files.forEach((file) => image.download(file, file.name))
    })
  } catch {
    index.value = start
    toast.error(t('story.saveError'))
  }
}

watch(open, (value) => {
  if (value) {
    index.value = 0
    canShare.value = image.canShareFiles()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="story">
      <div v-if="open" class="story-scrim" @click.self="emit('close')">
        <section
          ref="panelRef"
          class="story"
          role="dialog"
          aria-modal="true"
          :aria-label="t('story.title')"
          @keydown="onKeydown"
        >
          <header class="story__top">
            <div class="story__progress" aria-hidden="true">
              <span v-for="(item, position) in slides" :key="item.key" :class="{ 'is-done': position <= index }" />
            </div>
            <UiIconButton :icon="X" :label="t('common.close')" variant="ghost" size="xs" @click="emit('close')" />
          </header>

          <div class="story__stage">
            <button
              type="button"
              class="story__nav"
              :aria-label="t('story.previous')"
              :disabled="index === 0"
              @click="go(-1)"
            >
              <ChevronLeft aria-hidden="true" />
            </button>

            <div
              ref="slideRef"
              class="slide"
              :class="`slide--${slide.theme}`"
              role="img"
              :aria-label="`${slide.kicker}. ${slide.big}. ${slide.sub ?? ''}`"
              @click="onTap"
            >
              <div class="slide__body">
                <span class="slide__kicker">{{ slide.kicker }}</span>
                <strong class="slide__big" :class="{ 'slide__big--long': slide.big.length > 9 }">{{
                  slide.big
                }}</strong>
                <div v-if="slide.split !== undefined" class="slide__split" aria-hidden="true">
                  <span :style="{ width: `${slide.split}%` }" />
                </div>
                <span v-if="slide.sub" class="slide__sub">{{ slide.sub }}</span>
              </div>
              <span class="slide__brand">TG Analyzer</span>
            </div>

            <button
              type="button"
              class="story__nav"
              :aria-label="t('story.next')"
              :disabled="index === slides.length - 1"
              @click="go(1)"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>

          <footer class="story__actions">
            <UiSwitch v-if="data.summary.type !== 'group'" v-model="showName" class="story__name">
              {{ t('story.showName') }}
            </UiSwitch>
            <div class="story__buttons">
              <UiButton variant="secondary" size="sm" :icon="Download" :loading="image.busy.value" @click="saveCurrent">
                {{ t('story.saveSlide') }}
              </UiButton>
              <UiButton variant="primary" size="sm" :icon="Share2" :loading="image.busy.value" @click="shareAll">
                {{ canShare ? t('story.shareAll') : t('story.saveAll') }}
              </UiButton>
            </div>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.story-scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background: var(--scrim);
  backdrop-filter: blur(var(--blur-sm));
}

.story {
  display: grid;
  gap: var(--space-3);
  width: min(480px, 100%);
  max-height: 100%;
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--surface-raised);
  box-shadow: var(--shadow-overlay);
}

.story__top {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.story__progress {
  display: flex;
  flex: 1;
  gap: var(--space-1);
}

.story__progress span {
  flex: 1;
  height: 3px;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  transition: background-color var(--transition-normal);
}

.story__progress span.is-done {
  background: var(--accent);
}

.story__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 0;
}

.story__nav {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: var(--control-sm);
  height: var(--control-sm);
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  --icon-size: var(--icon-md);
}

@media (hover: hover) {
  .story__nav:hover:not(:disabled) {
    background: var(--hover);
    color: var(--text);
  }
}

.story__nav:disabled {
  opacity: var(--opacity-disabled);
  cursor: default;
}

/* ─── The slide: 9:16, sized by the viewport, text scaled with it ─────────── */
.slide {
  position: relative;
  flex: 0 1 auto;
  width: min(340px, 100%, calc((100dvh - 240px) * 9 / 16));
  aspect-ratio: 9 / 16;
  overflow: hidden;
  border-radius: var(--radius-lg);
  container-type: inline-size;
  cursor: pointer;
  user-select: none;
}

/* Padding lives here: cqw on .slide itself would resolve against the viewport. */
.slide__body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4cqw;
  height: 100%;
  padding: 10cqw 8cqw;
}

.slide--accent {
  background: linear-gradient(160deg, var(--accent) 0%, var(--accent-2) 100%);
  color: var(--on-accent);
}

.slide--ink {
  background: var(--inverse-surface);
  color: var(--on-inverse);
}

.slide--paper {
  background: var(--surface);
  color: var(--text);
  box-shadow: inset 0 0 0 1px var(--border);
}

.slide__kicker {
  font-size: 5.5cqw;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.8;
}

.slide__big {
  font-size: 22cqw;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.slide__big--long {
  font-size: 13cqw;
  line-height: 1.1;
}

.slide__split {
  display: flex;
  height: 3.5cqw;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--accent-2);
}

.slide__split span {
  background: var(--accent);
}

.slide__sub {
  font-size: 6cqw;
  font-weight: 500;
  line-height: 1.3;
  opacity: 0.85;
}

.slide__brand {
  position: absolute;
  right: 8cqw;
  bottom: 6cqw;
  font-size: 4.5cqw;
  font-weight: 700;
  letter-spacing: -0.02em;
  opacity: 0.7;
}

.story__actions {
  display: grid;
  gap: var(--space-2);
}

.story__buttons {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.story-enter-active,
.story-leave-active {
  transition: opacity var(--transition-normal);
}

.story-enter-from,
.story-leave-to {
  opacity: 0;
}

/* Phones: the story fills the screen, actions full width at the bottom. */
@media (max-width: 640px) {
  .story-scrim {
    padding: 0;
  }

  .story {
    width: 100%;
    height: 100%;
    border-width: 0;
    border-radius: 0;
    padding: var(--space-3) var(--space-3) max(var(--space-3), env(safe-area-inset-bottom));
    grid-template-rows: auto minmax(0, 1fr) auto;
  }

  .story__nav {
    display: none;
  }

  .slide {
    width: min(100%, calc((100dvh - 200px) * 9 / 16));
  }

  .story__buttons :deep(.btn) {
    flex: 1;
  }
}
</style>
