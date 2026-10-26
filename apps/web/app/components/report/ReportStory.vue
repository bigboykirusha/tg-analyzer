<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'
import { loadChatAvatar, loadProfileAvatar } from '../../lib/avatar-loader'
import { ChevronLeft, ChevronRight, Download, Share2, X } from '../../lib/icons'
import type { StoryBlock, StoryPerson, StorySlideModel } from './StorySlide.vue'

/**
 * «Итоги» as Wrapped-style stories: four dense slides (the chat at a glance,
 * who leads, when, which words), each a headline over a small bento of tiles,
 * made to be shared one by one. Full screen on phones, a 9:16 frame on wider screens; progress
 * bars on top, auto-advance, hold to pause, tap the sides or swipe to move,
 * swipe down to close. Slides save as 1080×1920 PNGs or go to the share sheet.
 */
const props = defineProps<{
  open: boolean
  data: ReportDto
  /** The public example: no account, so no photos to fetch. */
  offline?: boolean
}>()
const emit = defineEmits<{ close: [] }>()

const { t, tc, formatNumber, formatPercent, formatDuration, formatDay, formatDecimal } = useI18n()
const toast = useToast()
const image = useCardImage()
const auth = useAuthStore()
const nameOf = useParticipantName()

/** A move longer than this is a swipe, shorter is a tap. */
const SWIPE_PX = 40
const DAY_SECONDS = 86_400
/** Below this many replies on either side a speed comparison is noise. */
const MIN_REPLY_SAMPLES = 5
/** Differences smaller than this ratio read as «about the same». */
const EVEN_RATIO = 1.25
/** The intro seismograph stays legible at story size with this many ticks at most. */
const PULSE_TICKS = 90

type ShareTarget = 'instagram' | 'telegram' | 'chat'
type Persona = 'morning' | 'day' | 'evening' | 'night'

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
// Focus starts on the frame itself, so no button opens with a focus ring.
useFocusTrap(panelRef, open, {
  initial: () => panelRef.value,
  onEscape: () => {
    if (shareOpen.value) shareOpen.value = false
    else emit('close')
  },
})

const DAY_MONTH: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
const LONG_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
const isGroup = computed(() => props.data.summary.type === 'group')
const group = computed(() => props.data.report.group ?? null)

const me = computed<StoryPerson>(() => ({
  name: auth.user?.firstName?.trim() || auth.user?.username || t('story.you'),
  avatar: myAvatar.value,
}))
const them = computed<StoryPerson>(() => ({ name: props.data.summary.title, avatar: theirAvatar.value }))
/** The other side in labels: the person, or «Остальные» in a group. */
const theirName = computed(() => (isGroup.value ? t('story.others') : them.value.name))

/** Who the story is about: the two of you, or the group itself. */
const people = computed(() => (isGroup.value ? [them.value] : [me.value, them.value]))
const heading = computed(() => (isGroup.value ? them.value.name : `${me.value.name} & ${them.value.name}`))
const period = computed(() => {
  const { firstMessageAt, lastMessageAt } = props.data.report.period
  if (!firstMessageAt || !lastMessageAt) return null
  return `${formatDay(firstMessageAt.slice(0, 10), DAY_MONTH)} — ${formatDay(lastMessageAt.slice(0, 10), LONG_DATE)}`
})
const headingSub = computed(() =>
  isGroup.value && group.value ? tc('story.members', group.value.participants.length) : period.value,
)

const top = (items: { value: string }[], count = 5) => items.slice(0, count).map((item) => item.value)
const days = (seconds: number) => tc('report.highlights.days', Math.round(seconds / DAY_SECONDS))
const hour = (value: number) => String(value).padStart(2, '0')

/** «Вечерние собеседники» from the middle of the usual window. */
function personaOf(from: number, length: number): Persona {
  const middle = (from + length / 2) % 24
  if (middle >= 5 && middle < 11) return 'morning'
  if (middle >= 11 && middle < 17) return 'day'
  if (middle >= 17 && middle < 22) return 'evening'
  return 'night'
}

/** The usual window, the same one the report shows in Activity. */
const usual = computed(() => {
  const span = props.data.derived.availabilityProfile.peakWindow
  if (!span) return null
  const [from = 0, to = 0] = span.split('-').map((time) => Number.parseInt(time, 10))
  const length = (to - from + 24) % 24 || 24
  const weekday = props.data.report.activity.weekday
  const busiest = weekday.reduce((best, value, day) => (value.total > (weekday[best]?.total ?? 0) ? day : best), 0)
  return {
    from,
    to,
    persona: personaOf(from, length),
    day: weekday[busiest]?.total ? (t('chart.weekdaysLong').split(',')[busiest] ?? '') : '',
  }
})

/**
 * The caption that goes with shared pictures: real numbers and the address,
 * so whoever sees it can make their own.
 */
const shareText = computed(() => {
  const { totals, responses } = props.data.report
  const values = { count: formatNumber(totals.messages), site: t('story.site') }
  if (isGroup.value) return tc('story.shareText.group', totals.messages, { ...values, name: them.value.name })
  const mine = responses.iWriteFirstPct
  if (mine === null || Math.abs(mine - 50) <= 5) return tc('story.shareText.even', totals.messages, values)
  return tc(mine > 50 ? 'story.shareText.me' : 'story.shareText.them', totals.messages, values)
})

/** Stat tiles sit in pairs; an odd one out takes the full row. */
function paired(blocks: StoryBlock[]) {
  const stats = blocks.filter((block) => block.kind === 'stat' && !block.wide)
  if (stats.length % 2) stats[stats.length - 1]!.wide = true
  return blocks
}

const slides = computed<StorySlideModel[]>(() => {
  const { report } = props.data
  const { totals, facts, responses, vocabulary, activity, sessions, habits } = report
  const list: StorySlideModel[] = []
  const myName = me.value.name
  const otherName = theirName.value

  // The whole chat as the signature seismograph, bucketed to stay legible.
  const daily = fillDailyGaps(activity.daily)
  const size = Math.max(1, Math.ceil(daily.length / PULSE_TICKS))
  const pulse: { sent: number; received: number }[] = []
  daily.forEach((day, index) => {
    if (index % size === 0) pulse.push({ sent: 0, received: 0 })
    pulse[pulse.length - 1]!.sent += day.sent
    pulse[pulse.length - 1]!.received += day.received
  })

  const mineShare = totals.messages ? (totals.sent / totals.messages) * 100 : 50
  const perDay = formatDecimal(totals.messages / Math.max(facts.activeDays, 1))
  const streak = facts.maxStreak.days
  const busiest = facts.mostActiveDate
  const gap = facts.longestGap
  /** «Who does it more» as a tile: the name, and both counts underneath. */
  const whoMore = (label: string, pair: { mine: number; theirs: number }, accent = false): StoryBlock | null => {
    if (pair.mine + pair.theirs < MIN_REPLY_SAMPLES) return null
    const even = Math.abs(pair.mine - pair.theirs) <= Math.max(pair.mine, pair.theirs) * 0.1
    return {
      kind: 'stat',
      label,
      value: even ? t('story.even') : pair.mine > pair.theirs ? myName : otherName,
      note: `${myName} ${formatNumber(pair.mine)} · ${otherName} ${formatNumber(pair.theirs)}`,
      accent,
    }
  }

  // 1. The chat at a glance: how much, how evenly and for how long.
  const overview: StoryBlock[] = []
  if (pulse.length > 1) overview.push({ kind: 'pulse', label: t('story.pulseLabel'), days: pulse })
  if (totals.messages && !isGroup.value)
    overview.push({
      kind: 'split',
      label: t('story.whoWritesMore'),
      mine: Math.round(mineShare),
      mineLabel: `${myName} · ${formatNumber(totals.sent)}`,
      theirsLabel: `${formatNumber(totals.received)} · ${otherName}`,
      note:
        Math.abs(mineShare - 50) <= 5
          ? t('story.balanceEven')
          : t('story.balanceMore', {
              name: mineShare > 50 ? myName : otherName,
              share: formatPercent(mineShare > 50 ? mineShare : 100 - mineShare),
            }),
    })
  overview.push({ kind: 'stat', label: t('story.perDay'), value: perDay, accent: true })
  overview.push(
    streak >= 3
      ? { kind: 'stat', label: t('story.posterStreak'), value: tc('report.highlights.days', streak) }
      : { kind: 'stat', label: t('story.activeDays'), value: formatNumber(facts.activeDays) },
  )
  list.push({
    key: 'overview',
    theme: 1,
    durationMs: 9000,
    kicker: t(isGroup.value ? 'story.volumeKickerGroup' : 'story.volumeKicker'),
    title: formatNumber(totals.messages),
    sub: [tc('story.messagesWord', totals.messages), tc('story.activeDaysCount', facts.activeDays)].join(' · '),
    blocks: overview,
  })

  // 2. The dynamic: who starts and who replies faster — or, in a group, whose voice carries.
  if (isGroup.value && group.value?.participants.length) {
    const voices = group.value.participants.slice(0, 5)
    const leader = voices[0]!
    const most = Math.max(...voices.map((person) => person.messageShare), 1)
    list.push({
      key: 'voices',
      theme: 3,
      durationMs: 9000,
      kicker: t('story.voicesKicker'),
      title: nameOf(leader),
      sub: t('story.voicesSub', { share: formatPercent(leader.messageShare) }),
      blocks: [
        {
          kind: 'ranking',
          label: t('story.topVoices'),
          items: voices.map((person) => ({
            name: nameOf(person),
            value: formatPercent(person.messageShare),
            share: (person.messageShare / most) * 100,
          })),
        },
        { kind: 'stat', label: t('story.yourShare'), value: formatPercent(mineShare), accent: true },
        { kind: 'stat', label: t('story.membersLabel'), value: formatNumber(group.value.participants.length) },
      ],
    })
  } else if (!isGroup.value && responses.iWriteFirstPct !== null) {
    const mine = responses.iWriteFirstPct
    const even = Math.abs(mine - 50) <= 5
    const starter = mine >= 50 ? myName : otherName
    const { medianMineSec, medianTheirsSec, mineSamples, theirsSamples } = responses
    const blocks: StoryBlock[] = []
    if (medianMineSec !== null && medianTheirsSec !== null) {
      let note: string | undefined
      if (mineSamples >= MIN_REPLY_SAMPLES && theirsSamples >= MIN_REPLY_SAMPLES) {
        const ratio = Math.max(medianMineSec, medianTheirsSec) / Math.max(Math.min(medianMineSec, medianTheirsSec), 1)
        note =
          ratio < EVEN_RATIO
            ? t('story.speedEven')
            : medianMineSec < medianTheirsSec
              ? t('story.speedFasterYou', { ratio: formatDecimal(ratio) })
              : t('story.speedFaster', { name: otherName, ratio: formatDecimal(ratio) })
      }
      blocks.push({
        kind: 'duel',
        label: t('story.replySpeed'),
        left: { label: myName, value: formatDuration(medianMineSec) },
        right: { label: otherName, value: formatDuration(medianTheirsSec) },
        note,
      })
    }
    if (gap && gap.seconds >= 2 * DAY_SECONDS)
      blocks.push({
        kind: 'stat',
        label: t('story.longestSilence'),
        value: days(gap.seconds),
        note:
          gap.brokenByMe === undefined
            ? undefined
            : t('story.silenceBrokenBy', { name: gap.brokenByMe ? myName : otherName }),
        accent: true,
      })
    if (habits?.lastWordMinePct != null) {
      const lastMine = habits.lastWordMinePct
      blocks.push({
        kind: 'stat',
        label: t('story.lastWord'),
        value: Math.abs(lastMine - 50) <= 5 ? t('story.even') : lastMine > 50 ? myName : otherName,
        note: t('story.lastWordNote', { share: formatPercent(lastMine > 50 ? lastMine : 100 - lastMine) }),
      })
    }
    list.push({
      key: 'starts',
      theme: 3,
      durationMs: 9000,
      kicker: t('story.startsKicker'),
      title: even ? t('story.startsEvenTitle') : starter,
      sub: even
        ? t('story.startsEvenSub')
        : t(mine >= 50 ? 'story.startsSubYou' : 'story.startsSub', {
            share: formatPercent(mine >= 50 ? mine : 100 - mine),
          }),
      blocks: paired(blocks),
    })
  }

  // 3. When: the usual window as a persona, the hours and the records.
  const time = usual.value
  if (time) {
    const blocks: StoryBlock[] = [
      {
        kind: 'bars',
        label: t('story.hoursLabel'),
        values: activity.hourly.map((value) => value.total),
        from: time.from,
        to: (time.to + 23) % 24,
        note:
          sessions.nightSessionsPct !== null
            ? t('story.nightNote', { share: formatPercent(sessions.nightSessionsPct) })
            : undefined,
      },
    ]
    const longest = [...sessions.highlights].sort((a, b) => b.durationSec - a.durationSec)[0]
    if (longest)
      blocks.push({
        kind: 'stat',
        label: t('story.longestTalk'),
        value: formatDuration(longest.durationSec),
        note: formatDay(longest.startedAt.slice(0, 10), DAY_MONTH),
      })
    if (busiest)
      blocks.push({
        kind: 'stat',
        label: t('story.busiestDay'),
        value: tc('common.messagesCount', busiest.total),
        note: formatDay(busiest.date, DAY_MONTH),
        accent: true,
      })
    list.push({
      key: 'time',
      theme: 4,
      durationMs: 9000,
      kicker: t('story.timeKicker'),
      title: t(`story.persona.${time.persona}`),
      sub: time.day
        ? t('story.timeSubDay', { from: hour(time.from), to: hour(time.to), day: time.day })
        : t('story.timeSub', { from: hour(time.from), to: hour(time.to) }),
      blocks: paired(blocks),
    })
  }

  // 4. Words: the word of the chat, each side's favourites, emoji and habits.
  const myWords = top(vocabulary.topWordsBySender.mine, 3)
  const theirWords = top(vocabulary.topWordsBySender.theirs, 3)
  const chatWord = top(vocabulary.topWords, 1)[0] ?? myWords[0]
  if (chatWord) {
    const blocks: StoryBlock[] = []
    if (myWords.length && theirWords.length)
      blocks.push({
        kind: 'columns',
        left: { title: myName, items: myWords },
        right: { title: otherName, items: theirWords },
      })
    const myEmoji = top(vocabulary.topEmojiBySender.mine, 3)
    const theirEmoji = top(vocabulary.topEmojiBySender.theirs, 3)
    if (myEmoji.length && theirEmoji.length)
      blocks.push({
        kind: 'duel',
        label: t('story.emoji'),
        left: { label: myName, value: myEmoji.join(' ') },
        right: { label: otherName, value: theirEmoji.join(' ') },
      })
    const laughs = habits ? whoMore(t('story.laughs'), habits.laughs, true) : null
    if (laughs) blocks.push(laughs)
    const questions = habits ? whoMore(t('story.questions'), habits.questions) : null
    if (questions) blocks.push(questions)
    list.push({
      key: 'words',
      theme: 6,
      durationMs: 9000,
      kicker: t('story.wordsKicker'),
      title: `«${chatWord}»`,
      blocks: paired(blocks.slice(0, 6)),
    })
  }

  // The closing slide carries the address, so a shared picture leads back here.
  list[list.length - 1]!.last = true
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
        await image.share(files, shareText.value)
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
  if (props.offline) return
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
          tabindex="-1"
          class="stories__frame"
          :class="{ 'is-paper': current.theme !== 1 }"
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
            <StorySlide
              :key="current.key"
              :slide="current"
              :people="people"
              :heading="heading"
              :heading-sub="headingSub"
              chrome
            />
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
                    animationDuration: `${current.durationMs}ms`,
                    animationPlayState: paused || image.busy.value ? 'paused' : 'running',
                  }"
                  @animationend="onSegmentDone"
                />
                <span v-else class="stories__fill" :class="{ 'is-done': position < index }" />
              </span>
            </div>
            <div class="stories__bar">
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
          <StorySlide :slide="exportSlide" :people="people" :heading="heading" :heading-sub="headingSub" still />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Controls over a paper slide switch to ink, like the slide itself. */
.stories__frame.is-paper {
  --story-ink: var(--story-paper-ink);
  --story-ink-muted: var(--story-paper-ink-muted);
  --story-track: var(--story-paper-track);
  --story-chip: var(--story-paper-chip);
  --story-backdrop: var(--story-gradient-4);
}

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

.stories__icon {
  display: inline-grid;
  place-items: center;
  width: var(--control-sm);
  height: var(--control-sm);
  border: 0;
  border-radius: var(--radius-full);
  background: var(--story-chip);
  color: var(--story-ink);
  cursor: pointer;
  pointer-events: auto;
  --icon-size: var(--icon-md);
}

.stories__frame:focus {
  outline: none;
}

.stories__icon:focus-visible,
.stories__action:focus-visible,
.stories__arrow:focus-visible {
  box-shadow: 0 0 0 2px var(--story-ink);
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
