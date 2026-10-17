<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, Share2, X } from '../../lib/icons'
import type { StorySlideModel } from './StorySlide.vue'

/**
 * «Итоги» as Instagram-style stories: full screen on phones, a 9:16 frame on
 * wider screens; progress bars on top, auto-advance, hold to pause, tap the
 * sides or swipe to move, swipe down to close. Slides save as 1080×1920 PNGs
 * or go to the phone's share sheet.
 */
const props = defineProps<{ open: boolean; data: ReportDto }>()
const emit = defineEmits<{ close: [] }>()

const { t, tc, formatNumber, formatPercent, formatDuration, formatDay, formatDecimal } = useI18n()
const toast = useToast()
const image = useCardImage()

/** How long one slide stays before the next, like stories. */
const SLIDE_MS = 6000
/** A move longer than this is a swipe, shorter is a tap. */
const SWIPE_PX = 40
const DAY_SECONDS = 86_400

const index = ref(0)
const paused = ref(false)
const hideName = ref(false)
const canShare = ref(false)
/** Slide rendered off screen for the image; null when not exporting. */
const exportIndex = ref<number | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const exportRef = ref<HTMLElement | null>(null)
const open = toRef(props, 'open')

useBodyScrollLock(open)
useFocusTrap(panelRef, open, { onEscape: () => emit('close') })

const DAY_MONTH: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
const LONG_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
const isGroup = computed(() => props.data.summary.type === 'group')
const mine = computed(() => t('story.you'))
const theirs = computed(() => (hideName.value && !isGroup.value ? t('story.them') : props.data.summary.title))
const theirsShort = computed(() => (isGroup.value ? t('story.others') : theirs.value))

const top = (items: { value: string }[], count = 5) => items.slice(0, count).map((item) => item.value)

const slides = computed<StorySlideModel[]>(() => {
  const { report } = props.data
  const { totals, facts, responses, vocabulary, activity, sessions, composition, period } = report
  const list: StorySlideModel[] = []

  // 1. Intro
  list.push({
    key: 'intro',
    theme: 1,
    kicker: t('story.kicker'),
    title: t('story.introTitle'),
    sub:
      period.firstMessageAt && period.lastMessageAt
        ? `${formatDay(period.firstMessageAt.slice(0, 10), DAY_MONTH)} — ${formatDay(period.lastMessageAt.slice(0, 10), LONG_DATE)}`
        : undefined,
    stats: [
      { label: t('story.activeDays'), value: formatNumber(facts.activeDays) },
      { label: t('story.conversations'), value: formatNumber(sessions.totalSessions) },
      ...(facts.maxStreak.days >= 2
        ? [{ label: t('story.bestStreak'), value: tc('report.highlights.days', facts.maxStreak.days) }]
        : []),
    ],
  })

  // 2. Messages and who writes more
  if (totals.messages) {
    list.push({
      key: 'messages',
      theme: 3,
      kicker: t('story.messagesKicker'),
      title: formatNumber(totals.messages),
      sub: t('story.messagesSub', { perDay: formatDecimal(totals.messages / Math.max(facts.activeDays, 1)) }),
      split: {
        mine: Math.round((totals.sent / totals.messages) * 100),
        mineLabel: `${mine.value} · ${formatNumber(totals.sent)}`,
        theirsLabel: `${formatNumber(totals.received)} · ${theirsShort.value}`,
      },
      stats: facts.mostActiveDate
        ? [
            {
              label: t('story.busiestDay'),
              value: `${formatDay(facts.mostActiveDate.date, DAY_MONTH)} · ${formatNumber(facts.mostActiveDate.total)}`,
            },
          ]
        : undefined,
    })
  }

  // 3. Who writes first and how
  if (!isGroup.value && responses.iWriteFirstPct !== null) {
    const { mine: myWords, theirs: theirWords } = vocabulary.wordsPerMessage
    list.push({
      key: 'starts',
      theme: 2,
      kicker: t('story.startsKicker'),
      title: formatPercent(responses.iWriteFirstPct),
      sub: t('story.startsSub', { name: theirs.value }),
      split: { mine: responses.iWriteFirstPct, mineLabel: mine.value, theirsLabel: theirs.value },
      stats: [
        ...(myWords !== null && theirWords !== null
          ? [{ label: t('story.wordsPerMessage'), value: `${formatDecimal(myWords)} / ${formatDecimal(theirWords)}` }]
          : []),
        ...(composition.voice ? [{ label: t('story.voice'), value: formatNumber(composition.voice) }] : []),
        ...(composition.sticker ? [{ label: t('story.stickers'), value: formatNumber(composition.sticker) }] : []),
      ].slice(0, 3),
    })
  }

  // 4. Time of day
  const hourly = activity.hourly.map((hour) => hour.total)
  const peak = hourly.reduce((best, value, hour) => (value > (hourly[best] ?? 0) ? hour : best), 0)
  if (hourly[peak]) {
    const weekday = activity.weekday
    const busiest = weekday.reduce((best, value, day) => (value.total > (weekday[best]?.total ?? 0) ? day : best), 0)
    list.push({
      key: 'hours',
      theme: 5,
      kicker: t('story.hoursKicker'),
      title: `${String(peak).padStart(2, '0')}:00`,
      sub: t('story.hoursSub', { day: t('chart.weekdaysLong').split(',')[busiest] ?? '' }),
      bars: { values: hourly, highlight: peak },
      stats:
        sessions.nightSessionsPct !== null
          ? [{ label: t('story.night'), value: formatPercent(sessions.nightSessionsPct) }]
          : undefined,
    })
  }

  // 5. Reply speed (private chats)
  if (!isGroup.value && responses.medianTheirsSec !== null) {
    const { medianMineSec, medianTheirsSec, responseRate } = responses
    let verdict: string | undefined
    if (medianMineSec !== null) {
      const ratio = Math.max(medianMineSec, medianTheirsSec) / Math.max(Math.min(medianMineSec, medianTheirsSec), 1)
      verdict =
        ratio < 1.25
          ? t('story.speedEven')
          : t(medianMineSec < medianTheirsSec ? 'story.speedYouFaster' : 'story.speedThemFaster', {
              ratio: formatDecimal(ratio),
            })
    }
    list.push({
      key: 'speed',
      theme: 4,
      kicker: t('story.speedKicker'),
      title: formatDuration(medianTheirsSec),
      sub: t('story.speedSub', { name: theirs.value }),
      stats: [
        ...(medianMineSec !== null ? [{ label: t('story.youReply'), value: formatDuration(medianMineSec) }] : []),
        ...(responseRate !== null ? [{ label: t('story.replyRate'), value: formatPercent(responseRate) }] : []),
        ...(verdict ? [{ label: t('story.verdict'), value: verdict }] : []),
      ],
    })
  }

  // 6. Records
  const longest = [...sessions.highlights].sort((a, b) => b.durationSec - a.durationSec)[0]
  const gap = facts.longestGap
  const streak = facts.maxStreak
  if (streak.days >= 2 || longest) {
    const hasStreak = streak.days >= 2
    list.push({
      key: 'records',
      theme: 1,
      kicker: t('story.recordsKicker'),
      title: hasStreak ? tc('report.highlights.days', streak.days) : formatDuration(longest!.durationSec),
      sub:
        hasStreak && streak.startDate && streak.endDate
          ? t('story.streakSub', {
              from: formatDay(streak.startDate, DAY_MONTH),
              to: formatDay(streak.endDate, DAY_MONTH),
            })
          : t('story.longestTalk'),
      stats: [
        ...(longest && hasStreak
          ? [
              {
                label: t('story.longestTalk'),
                value: `${formatDuration(longest.durationSec)} · ${formatDay(longest.startedAt.slice(0, 10), DAY_MONTH)}`,
              },
            ]
          : []),
        ...(gap && gap.seconds >= 2 * DAY_SECONDS
          ? [
              {
                label:
                  gap.brokenByMe === undefined
                    ? t('story.longestSilence')
                    : t(gap.brokenByMe ? 'story.silenceByYou' : 'story.silenceByThem'),
                value: tc('report.highlights.days', Math.round(gap.seconds / DAY_SECONDS)),
              },
            ]
          : []),
      ],
    })
  }

  // 7. Words
  const myWords = top(isGroup.value ? vocabulary.topWords : vocabulary.topWordsBySender.mine)
  const theirWords = top(vocabulary.topWordsBySender.theirs)
  if (myWords.length) {
    list.push({
      key: 'words',
      theme: 3,
      kicker: t('story.wordsKicker'),
      title: `«${myWords[0]}»`,
      sub: isGroup.value ? t('story.wordsGroupSub') : t('story.wordsSub'),
      columns:
        theirWords.length && vocabulary.topWordsBySender.mine.length
          ? {
              left: { title: mine.value, items: top(vocabulary.topWordsBySender.mine) },
              right: { title: theirsShort.value, items: theirWords },
            }
          : undefined,
    })
  }

  // 8. Emoji
  const myEmoji = top(
    vocabulary.topEmojiBySender.mine.length ? vocabulary.topEmojiBySender.mine : vocabulary.topEmoji,
    3,
  )
  if (myEmoji.length) {
    const theirEmoji = top(vocabulary.topEmojiBySender.theirs, 4)
    list.push({
      key: 'emoji',
      theme: 2,
      kicker: t('story.emojiKicker'),
      title: t('story.emojiTitle'),
      emoji: myEmoji,
      sub: t('story.emojiSub'),
      stats: theirEmoji.length ? [{ label: theirsShort.value, value: theirEmoji.join(' ') }] : undefined,
    })
  }

  // 9. Outro
  list.push({
    key: 'outro',
    theme: 5,
    kicker: t('story.outroKicker'),
    title: 'TG Analyzer',
    sub: t('story.outroSub'),
    stats: [
      { label: t('story.messagesKicker'), value: formatNumber(totals.messages) },
      { label: t('story.activeDays'), value: formatNumber(facts.activeDays) },
    ],
  })
  return list
})

const current = computed(() => slides.value[Math.min(index.value, slides.value.length - 1)]!)
const exportSlide = computed(() => (exportIndex.value === null ? null : slides.value[exportIndex.value]))

function go(step: 1 | -1) {
  const next = index.value + step
  if (next < 0) return
  if (next >= slides.value.length) {
    paused.value = true
    return
  }
  index.value = next
}

/** The active progress bar finished filling: move on, like stories. */
function onSegmentDone() {
  if (index.value < slides.value.length - 1) index.value += 1
  else paused.value = true
}

// ─── Gestures: touch on phones, mouse elsewhere; holding pauses ──────────────
let start: { x: number; y: number } | null = null

function begin(x: number, y: number) {
  start = { x, y }
  paused.value = true
}

function end(x: number, y: number, stage: HTMLElement) {
  paused.value = false
  if (!start) return
  const dx = x - start.x
  const dy = y - start.y
  start = null
  if (dy > 90 && Math.abs(dy) > Math.abs(dx)) {
    emit('close')
    return
  }
  if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
    go(dx < 0 ? 1 : -1)
    return
  }
  if (Math.abs(dx) > SWIPE_PX || Math.abs(dy) > SWIPE_PX) return
  const box = stage.getBoundingClientRect()
  go(x - box.left < box.width / 3 ? -1 : 1)
}

function onTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  if (touch) begin(touch.clientX, touch.clientY)
}

function onTouchEnd(event: TouchEvent) {
  const touch = event.changedTouches[0]
  if (!touch) return
  // The touch already moved the story; stop the synthetic click that follows.
  event.preventDefault()
  end(touch.clientX, touch.clientY, event.currentTarget as HTMLElement)
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  begin(event.clientX, event.clientY)
}

function onPointerUp(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  end(event.clientX, event.clientY, event.currentTarget as HTMLElement)
}

function onCancel() {
  start = null
  paused.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') go(1)
  else if (event.key === 'ArrowLeft') go(-1)
}

// ─── Images: rendered from an exact 9:16 copy off screen ─────────────────────
async function render(position: number) {
  exportIndex.value = position
  await nextTick()
  if (!exportRef.value) throw new Error('No slide to render')
  return image.render(exportRef.value)
}

async function saveCurrent() {
  paused.value = true
  try {
    await image.run(async () => image.download(await render(index.value), `tg-analyzer-${current.value.key}.png`))
  } catch {
    toast.error(t('story.saveError'))
  } finally {
    exportIndex.value = null
  }
}

async function shareAll() {
  paused.value = true
  try {
    await image.run(async () => {
      const files: File[] = []
      for (let position = 0; position < slides.value.length; position += 1) {
        const blob = await render(position)
        files.push(new File([blob], `tg-analyzer-${position + 1}.png`, { type: 'image/png' }))
      }
      exportIndex.value = null
      if (canShare.value) await image.share(files)
      else files.forEach((file) => image.download(file, file.name))
    })
  } catch {
    toast.error(t('story.saveError'))
  } finally {
    exportIndex.value = null
  }
}

watch(open, (value) => {
  if (!value) return
  index.value = 0
  paused.value = false
  canShare.value = image.canShareFiles()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="stories">
      <div v-if="open" class="stories" @click.self="emit('close')">
        <section
          ref="panelRef"
          class="stories__frame"
          role="dialog"
          aria-modal="true"
          :aria-label="t('story.title')"
          @keydown="onKeydown"
        >
          <div
            class="stories__stage"
            role="img"
            :aria-label="`${current.kicker}. ${current.title}. ${current.sub ?? ''}`"
            @touchstart.passive="onTouchStart"
            @touchend="onTouchEnd"
            @touchcancel="onCancel"
            @pointerdown="onPointerDown"
            @pointerup="onPointerUp"
            @pointercancel="onCancel"
          >
            <StorySlide :slide="current" :mine="mine" :theirs="theirs" />
          </div>

          <!-- Overlays on top of the slide, like stories. -->
          <div class="stories__top">
            <div class="stories__progress" aria-hidden="true">
              <span v-for="(item, position) in slides" :key="item.key" class="stories__segment">
                <span
                  v-if="position === index"
                  :key="`fill-${index}`"
                  class="stories__fill is-active"
                  :style="{
                    animationDuration: `${SLIDE_MS}ms`,
                    animationPlayState: paused || image.busy.value ? 'paused' : 'running',
                  }"
                  @animationend="onSegmentDone"
                />
                <span v-else class="stories__fill" :class="{ 'is-done': position < index }" />
              </span>
            </div>
            <div class="stories__bar">
              <span class="stories__count">{{ index + 1 }} / {{ slides.length }}</span>
              <button
                v-if="!isGroup"
                type="button"
                class="stories__icon"
                :aria-label="hideName ? t('story.showName') : t('story.hideName')"
                :aria-pressed="hideName"
                @click="hideName = !hideName"
              >
                <component :is="hideName ? EyeOff : Eye" aria-hidden="true" />
              </button>
              <button type="button" class="stories__icon" :aria-label="t('common.close')" @click="emit('close')">
                <X aria-hidden="true" />
              </button>
            </div>
          </div>

          <div class="stories__actions">
            <button type="button" class="stories__action" :disabled="image.busy.value" @click="saveCurrent">
              <Download aria-hidden="true" />
              {{ t('story.saveSlide') }}
            </button>
            <button
              type="button"
              class="stories__action stories__action--primary"
              :disabled="image.busy.value"
              @click="shareAll"
            >
              <span v-if="image.busy.value" class="stories__spinner" aria-hidden="true" />
              <Share2 v-else aria-hidden="true" />
              {{ canShare ? t('story.shareAll') : t('story.saveAll') }}
            </button>
          </div>
        </section>

        <button
          type="button"
          class="stories__arrow stories__arrow--prev"
          :aria-label="t('story.previous')"
          :disabled="index === 0"
          @click="go(-1)"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          class="stories__arrow stories__arrow--next"
          :aria-label="t('story.next')"
          :disabled="index === slides.length - 1"
          @click="go(1)"
        >
          <ChevronRight aria-hidden="true" />
        </button>

        <!-- Exact 9:16 copy for the exported image, off screen. -->
        <div v-if="exportSlide" ref="exportRef" class="stories__export" aria-hidden="true">
          <StorySlide :slide="exportSlide" :mine="mine" :theirs="theirs" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.stories {
  --frame-height: min(92dvh, 860px);
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  background: var(--story-backdrop);
}

.stories__frame {
  position: relative;
  height: var(--frame-height);
  aspect-ratio: 9 / 16;
  overflow: hidden;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-overlay);
}

.stories__stage {
  position: absolute;
  inset: 0;
  cursor: pointer;
  user-select: none;
  /* The story handles horizontal swipes itself. */
  touch-action: pan-y pinch-zoom;
}

/* ─── Top overlay: progress and controls ─────────────────────────────────── */
.stories__top {
  position: absolute;
  inset: 0 0 auto;
  display: grid;
  gap: var(--space-2);
  padding: max(var(--space-3), env(safe-area-inset-top)) var(--space-3) 0;
  pointer-events: none;
}

.stories__progress {
  display: flex;
  gap: var(--space-1);
}

.stories__segment {
  position: relative;
  flex: 1;
  height: 3px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--story-track);
}

.stories__fill {
  position: absolute;
  inset: 0;
  transform: scaleX(0);
  transform-origin: left;
  background: var(--story-ink);
}

.stories__fill.is-done {
  transform: scaleX(1);
}

.stories__fill.is-active {
  animation: story-fill linear forwards;
}

@keyframes story-fill {
  to {
    transform: scaleX(1);
  }
}

.stories__bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-1);
  color: var(--story-ink);
}

.stories__count {
  margin-right: auto;
  color: var(--story-ink-muted);
  font: var(--text-small);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stories__icon {
  display: inline-grid;
  place-items: center;
  width: var(--control-sm);
  height: var(--control-sm);
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--story-ink);
  cursor: pointer;
  pointer-events: auto;
  --icon-size: var(--icon-md);
}

@media (hover: hover) {
  .stories__icon:hover {
    background: var(--story-chip);
  }
}

/* ─── Bottom overlay: save and share ─────────────────────────────────────── */
.stories__actions {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3) max(var(--space-3), env(safe-area-inset-bottom));
}

.stories__action {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--control-md);
  border: 0;
  border-radius: var(--radius-full);
  background: var(--story-chip);
  backdrop-filter: blur(var(--blur-sm));
  color: var(--story-ink);
  cursor: pointer;
  font: var(--text-control);
}

.stories__action--primary {
  background: var(--story-ink);
  color: var(--story-backdrop);
}

.stories__action:disabled {
  opacity: var(--opacity-disabled);
  cursor: progress;
}

.stories__spinner {
  width: var(--icon-sm);
  height: var(--icon-sm);
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ─── Arrows beside the frame on wide screens ────────────────────────────── */
.stories__arrow {
  position: fixed;
  top: 50%;
  display: inline-grid;
  place-items: center;
  width: var(--control-md);
  height: var(--control-md);
  border: 0;
  border-radius: var(--radius-full);
  background: var(--story-chip);
  color: var(--story-ink);
  cursor: pointer;
  transform: translateY(-50%);
  --icon-size: var(--icon-md);
}

.stories__arrow--prev {
  left: calc(50% - var(--frame-height) * 9 / 32 - var(--control-md) - var(--space-4));
}

.stories__arrow--next {
  right: calc(50% - var(--frame-height) * 9 / 32 - var(--control-md) - var(--space-4));
}

.stories__arrow:disabled {
  opacity: var(--opacity-disabled);
  cursor: default;
}

.stories__export {
  position: fixed;
  top: 0;
  left: -10000px;
  width: 360px;
  height: 640px;
}

.stories-enter-active,
.stories-leave-active {
  transition: opacity var(--transition-normal);
}

.stories-enter-from,
.stories-leave-to {
  opacity: 0;
}

/* Phones: the story is the whole screen. */
@media (max-width: 640px) {
  .stories__frame {
    width: 100%;
    height: 100%;
    aspect-ratio: auto;
    border-radius: 0;
  }

  .stories__arrow {
    display: none;
  }
}
</style>
