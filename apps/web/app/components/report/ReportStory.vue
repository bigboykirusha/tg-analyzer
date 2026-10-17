<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { loadChatAvatar, loadProfileAvatar } from '../../lib/avatar-loader'
import { ChevronLeft, ChevronRight, Download, Share2, X } from '../../lib/icons'
import type { StoryPerson, StorySlideModel, StoryTile } from './StorySlide.vue'

/**
 * «Итоги» as Instagram-style stories: full screen on phones, a 9:16 frame on
 * wider screens; progress bars on top, auto-advance, hold to pause, tap the
 * sides or swipe to move, swipe down to close. Three dense slides that save as
 * 1080×1920 PNGs or go to the phone's share sheet (Instagram, Telegram, a chat).
 */
const props = defineProps<{ open: boolean; data: ReportDto }>()
const emit = defineEmits<{ close: [] }>()

const { t, tc, formatNumber, formatPercent, formatDuration, formatDay, formatDecimal } = useI18n()
const toast = useToast()
const image = useCardImage()
const auth = useAuthStore()

/** How long one slide stays before the next, like stories. */
const SLIDE_MS = 8000
/** A move longer than this is a swipe, shorter is a tap. */
const SWIPE_PX = 40
const DAY_SECONDS = 86_400

type ShareTarget = 'instagram' | 'telegram' | 'chat'

const index = ref(0)
const paused = ref(false)
const shareOpen = ref(false)
const canShare = ref(false)
const myAvatar = ref<string | null>(null)
const theirAvatar = ref<string | null>(null)
/** Slide rendered off screen for the image; null when not exporting. */
const exportIndex = ref<number | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const exportRef = ref<HTMLElement | null>(null)
const open = toRef(props, 'open')

useBodyScrollLock(open)
useFocusTrap(panelRef, open, {
  onEscape: () => {
    if (shareOpen.value) shareOpen.value = false
    else emit('close')
  },
})

const DAY_MONTH: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
const LONG_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
const isGroup = computed(() => props.data.summary.type === 'group')

const me = computed<StoryPerson>(() => ({
  name: auth.user?.firstName?.trim() || auth.user?.username || t('story.you'),
  avatar: myAvatar.value,
}))
const them = computed<StoryPerson>(() => ({ name: props.data.summary.title, avatar: theirAvatar.value }))
/** The other side in labels: the person, or «Остальные» in a group. */
const theirName = computed(() => (isGroup.value ? t('story.others') : them.value.name))

const top = (items: { value: string }[], count = 5) => items.slice(0, count).map((item) => item.value)
const days = (seconds: number) => tc('report.highlights.days', Math.round(seconds / DAY_SECONDS))

const slides = computed<StorySlideModel[]>(() => {
  const { report } = props.data
  const { totals, facts, responses, vocabulary, activity, sessions, composition, period } = report
  const list: StorySlideModel[] = []
  const myName = me.value.name
  const otherName = theirName.value

  // 1. The chat in numbers: volume, balance, who starts, reply times.
  const overview: StoryTile[] = []
  if (!isGroup.value && responses.iWriteFirstPct !== null) {
    const iStart = responses.iWriteFirstPct >= 50
    overview.push({
      label: t('story.firstWriter'),
      value: `${iStart ? myName : otherName} · ${formatPercent(iStart ? responses.iWriteFirstPct : 100 - responses.iWriteFirstPct)}`,
    })
  }
  if (!isGroup.value && responses.medianMineSec !== null)
    overview.push({ label: t('story.replies', { name: myName }), value: formatDuration(responses.medianMineSec) })
  if (!isGroup.value && responses.medianTheirsSec !== null)
    overview.push({ label: t('story.replies', { name: otherName }), value: formatDuration(responses.medianTheirsSec) })
  overview.push({ label: t('story.activeDays'), value: formatNumber(facts.activeDays) })
  if (facts.maxStreak.days >= 2)
    overview.push({ label: t('story.bestStreak'), value: tc('report.highlights.days', facts.maxStreak.days) })
  overview.push({ label: t('story.conversations'), value: formatNumber(sessions.totalSessions) })

  list.push({
    key: 'overview',
    theme: 1,
    kicker:
      period.firstMessageAt && period.lastMessageAt
        ? `${formatDay(period.firstMessageAt.slice(0, 10), DAY_MONTH)} — ${formatDay(period.lastMessageAt.slice(0, 10), LONG_DATE)}`
        : t('story.kicker'),
    title: formatNumber(totals.messages),
    sub: t('story.overviewSub', { perDay: formatDecimal(totals.messages / Math.max(facts.activeDays, 1)) }),
    split: totals.messages
      ? {
          mine: Math.round((totals.sent / totals.messages) * 100),
          mineLabel: `${myName} · ${formatNumber(totals.sent)}`,
          theirsLabel: `${formatNumber(totals.received)} · ${otherName}`,
        }
      : undefined,
    tiles: overview.slice(0, 6),
  })

  // 2. Rhythm and records: the peak hour, the busiest day, the longest talk and silence.
  const hourly = activity.hourly.map((hour) => hour.total)
  const peak = hourly.reduce((best, value, hour) => (value > (hourly[best] ?? 0) ? hour : best), 0)
  if (hourly[peak]) {
    const weekday = activity.weekday
    const busiest = weekday.reduce((best, value, day) => (value.total > (weekday[best]?.total ?? 0) ? day : best), 0)
    const longest = [...sessions.highlights].sort((a, b) => b.durationSec - a.durationSec)[0]
    const gap = facts.longestGap
    const rhythm: StoryTile[] = []
    if (facts.mostActiveDate)
      rhythm.push({
        label: t('story.busiestDay'),
        value: `${formatDay(facts.mostActiveDate.date, DAY_MONTH)} · ${formatNumber(facts.mostActiveDate.total)}`,
      })
    if (longest)
      rhythm.push({
        label: t('story.longestTalk'),
        value: `${formatDuration(longest.durationSec)} · ${formatDay(longest.startedAt.slice(0, 10), DAY_MONTH)}`,
      })
    if (gap && gap.seconds >= 2 * DAY_SECONDS)
      rhythm.push(
        gap.brokenByMe === undefined || isGroup.value
          ? { label: t('story.longestSilence'), value: days(gap.seconds) }
          : {
              label: t('story.silenceBroken'),
              value: t('story.silenceAfter', { name: gap.brokenByMe ? myName : otherName, days: days(gap.seconds) }),
            },
      )
    if (sessions.nightSessionsPct !== null)
      rhythm.push({ label: t('story.night'), value: formatPercent(sessions.nightSessionsPct) })

    list.push({
      key: 'rhythm',
      theme: 5,
      kicker: t('story.hoursKicker'),
      title: `${String(peak).padStart(2, '0')}:00`,
      sub: t('story.hoursSub', { day: t('chart.weekdaysLong').split(',')[busiest] ?? '' }),
      bars: { values: hourly, highlight: peak },
      tiles: rhythm.slice(0, 4),
    })
  }

  // 3. How you write: favourite words, emoji, voice notes and stickers.
  const myWords = top(vocabulary.topWordsBySender.mine)
  const theirWords = top(vocabulary.topWordsBySender.theirs)
  const chatWord = top(vocabulary.topWords, 1)[0]
  if (chatWord || myWords.length) {
    const myEmoji = top(vocabulary.topEmojiBySender.mine, 4)
    const theirEmoji = top(vocabulary.topEmojiBySender.theirs, 4)
    const style: StoryTile[] = []
    if (myEmoji.length) style.push({ label: t('story.emojiOf', { name: myName }), value: myEmoji.join(' ') })
    if (theirEmoji.length) style.push({ label: t('story.emojiOf', { name: otherName }), value: theirEmoji.join(' ') })
    const { mine: myLength, theirs: theirLength } = vocabulary.wordsPerMessage
    if (myLength !== null && theirLength !== null)
      style.push({
        label: t('story.wordsPerMessage'),
        value: `${formatDecimal(myLength)} / ${formatDecimal(theirLength)}`,
      })
    if (composition.voice) style.push({ label: t('story.voice'), value: formatNumber(composition.voice) })
    if (composition.sticker) style.push({ label: t('story.stickers'), value: formatNumber(composition.sticker) })

    list.push({
      key: 'words',
      theme: 2,
      kicker: t('story.wordsKicker'),
      title: `«${chatWord ?? myWords[0]}»`,
      sub: t('story.wordsSub'),
      columns:
        myWords.length && theirWords.length
          ? { left: { title: myName, items: myWords }, right: { title: otherName, items: theirWords } }
          : undefined,
      tiles: style.slice(0, 4),
    })
  }
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
  if (shareOpen.value) return
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

async function renderFiles(positions: number[]) {
  const files: File[] = []
  for (const position of positions) {
    const blob = await render(position)
    files.push(new File([blob], `tg-analyzer-${slides.value[position]!.key}.png`, { type: 'image/png' }))
  }
  exportIndex.value = null
  return files
}

async function saveCurrent() {
  paused.value = true
  try {
    await image.run(async () => {
      const [file] = await renderFiles([index.value])
      image.download(file!, file!.name)
    })
  } catch {
    toast.error(t('story.saveError'))
  } finally {
    exportIndex.value = null
  }
}

function openShare() {
  paused.value = true
  shareOpen.value = true
}

function closeShare() {
  shareOpen.value = false
  paused.value = false
}

/**
 * A story takes one 9:16 picture, so Instagram and Telegram get the current
 * slide; a chat gets all of them. The phone's share sheet lists the apps;
 * without one (desktop) the images are saved with a hint where to add them.
 */
async function shareTo(target: ShareTarget) {
  shareOpen.value = false
  paused.value = true
  try {
    await image.run(async () => {
      const positions = target === 'chat' ? slides.value.map((_, position) => position) : [index.value]
      const files = await renderFiles(positions)
      if (canShare.value) {
        await image.share(files)
        return
      }
      files.forEach((file) => image.download(file, file.name))
      toast.success(
        target === 'chat'
          ? t('story.savedForChat')
          : t('story.savedForApp', { app: target === 'instagram' ? 'Instagram' : 'Telegram' }),
      )
    })
  } catch {
    toast.error(t('story.saveError'))
  } finally {
    exportIndex.value = null
  }
}

async function loadAvatars() {
  const [mine, theirs] = await Promise.all([
    auth.telegramSessionActive ? loadProfileAvatar() : Promise.resolve(null),
    loadChatAvatar(props.data.summary.chatId).catch(() => null),
  ])
  myAvatar.value = mine
  theirAvatar.value = theirs
}

watch(open, (value) => {
  if (!value) return
  index.value = 0
  paused.value = false
  shareOpen.value = false
  canShare.value = image.canShareFiles()
  void loadAvatars()
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
            <StorySlide :slide="current" :me="me" :them="them" />
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
              :aria-expanded="shareOpen"
              @click="openShare"
            >
              <span v-if="image.busy.value" class="stories__spinner" aria-hidden="true" />
              <Share2 v-else aria-hidden="true" />
              {{ t('story.share') }}
            </button>
          </div>

          <!-- Where to share: a story takes the current slide, a chat gets all. -->
          <Transition name="stories-sheet">
            <div v-if="shareOpen" class="stories__share" @click.self="closeShare">
              <div class="stories__sheet" role="menu" :aria-label="t('story.shareTitle')">
                <strong class="stories__sheet-title">{{ t('story.shareTitle') }}</strong>
                <button
                  v-for="target in ['instagram', 'telegram', 'chat'] as const"
                  :key="target"
                  type="button"
                  role="menuitem"
                  class="stories__option"
                  @click="shareTo(target)"
                >
                  <span>{{ t(`story.share.${target}`) }}</span>
                  <small>{{
                    target === 'chat' ? t('story.shareAllSlides', { count: slides.length }) : t('story.shareThisSlide')
                  }}</small>
                </button>
                <button type="button" class="stories__option stories__option--cancel" @click="closeShare">
                  {{ t('common.cancel') }}
                </button>
              </div>
            </div>
          </Transition>
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
          <StorySlide :slide="exportSlide" :me="me" :them="them" />
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

/* ─── Share sheet over the slide ─────────────────────────────────────────── */
.stories__share {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: var(--space-3) var(--space-3) max(var(--space-3), env(safe-area-inset-bottom));
  background: var(--scrim);
}

.stories__sheet {
  display: grid;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: var(--surface-raised);
  color: var(--text);
  box-shadow: var(--shadow-overlay);
}

.stories__sheet-title {
  padding: 0 var(--space-1) var(--space-1);
  font: var(--text-title);
}

.stories__option {
  display: grid;
  gap: 2px;
  min-height: var(--control-lg);
  padding: var(--space-2) var(--space-4);
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--surface-2);
  color: var(--text);
  cursor: pointer;
  font: var(--text-control);
  text-align: left;
}

.stories__option small {
  color: var(--text-muted);
  font: var(--text-small);
}

.stories__option--cancel {
  place-items: center;
  background: transparent;
  color: var(--text-muted);
}

@media (hover: hover) {
  .stories__option:hover {
    background: var(--surface);
  }
}

.stories-sheet-enter-active,
.stories-sheet-leave-active {
  transition: opacity var(--transition-fast);
}

.stories-sheet-enter-active .stories__sheet,
.stories-sheet-leave-active .stories__sheet {
  transition: transform var(--transition-fast);
}

.stories-sheet-enter-from,
.stories-sheet-leave-to {
  opacity: 0;
}

.stories-sheet-enter-from .stories__sheet,
.stories-sheet-leave-to .stories__sheet {
  transform: translateY(var(--space-4));
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
