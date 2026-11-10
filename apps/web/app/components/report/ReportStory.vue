<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { ChevronLeft, ChevronRight, Download, Pause, Play, Share, X } from '../../lib/icons'

/**
 * «Итоги»: the report as a few full-screen frames on the person's poster colour, like stories —
 * marks of progress on top, the frame's name, pause and close; the frames turn by themselves, a tap
 * pages, a hold pauses, a swipe down closes (useStoryGestures). Under the frame: «Сохранить» the
 * picture and «Поделиться» it — a 1080 × 1920 PNG rendered from an exact copy off screen.
 * A phone fills the screen; wider screens show a 9:16 frame with arrows beside it.
 */
const props = defineProps<{
  open: boolean
  data: ReportDto
  /** What «Поделиться» asked for: just watch, save every frame, or send them all to the share sheet. */
  intent?: 'view' | 'save' | 'share'
}>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const toast = useToast()
const image = useCardImage()
const { frames, who } = useStoryFrames(() => props.data)

/** How long a frame stays before the next one comes. */
const FRAME_MS = 7000

const index = ref(0)
/** Paused with the button (WCAG 2.2.2): a hold or a tap never undoes it. */
const userPaused = ref(false)
/** Paging with the arrow keys is reading, not watching: the timer waits. */
const byKeys = ref(false)
const canShare = ref(false)
/** The frame rendered off screen for a picture; null when not exporting. */
const exportIndex = ref<number | null>(null)
const overlayRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const exportRef = ref<HTMLElement | null>(null)
const open = toRef(props, 'open')

useBodyScrollLock(open)
// The arrows sit beside the frame, so the focus trap covers the whole overlay; focus starts on the frame.
useFocusTrap(overlayRef, open, { initial: () => panelRef.value, onEscape: () => emit('close') })

const current = computed(() => frames.value[Math.min(index.value, frames.value.length - 1)]!)
const label = computed(() =>
  t('story.frameOf', { label: current.value.label, n: index.value + 1, total: frames.value.length }),
)

function go(step: 1 | -1) {
  const next = index.value + step
  if (next < 0 || next >= frames.value.length) return
  index.value = next
}
const gestures = useStoryGestures({
  go: (step) => {
    byKeys.value = false
    go(step)
  },
  close: () => emit('close'),
})
const waiting = computed(
  () =>
    userPaused.value ||
    byKeys.value ||
    gestures.pressed.value ||
    image.busy.value ||
    index.value >= frames.value.length,
)

/** The active mark finished filling: the next frame, like stories; the last one simply stays. */
function onSegmentDone() {
  if (index.value < frames.value.length - 1) index.value += 1
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
  byKeys.value = true
  go(event.key === 'ArrowRight' ? 1 : -1)
}

// ─── Pictures: rendered from an exact 9:16 copy off screen ───────────────────
async function renderFiles(positions: number[]) {
  const files: File[] = []
  for (const position of positions) {
    exportIndex.value = position
    await nextTick()
    if (!exportRef.value) throw new Error('No frame to render')
    const blob = await image.render(exportRef.value)
    files.push(new File([blob], `tg-analyzer-${frames.value[position]!.key}.png`, { type: 'image/png' }))
  }
  return files
}

/** Saves or sends the given frames; without a share sheet (desktop) sending saves them. */
async function deliver(positions: number[], send: boolean) {
  try {
    await image.run(async () => {
      const files = await renderFiles(positions)
      if (send && canShare.value) return void (await image.share(files))
      files.forEach((file) => image.download(file, file.name))
      toast.success(t(files.length > 1 ? 'story.savedAll' : 'story.savedOne'))
    })
  } catch {
    toast.error(t('story.saveError'))
  } finally {
    exportIndex.value = null
  }
}
const all = () => frames.value.map((_, position) => position)

watch(
  open,
  async (value) => {
    if (!value) return
    index.value = 0
    userPaused.value = false
    byKeys.value = false
    canShare.value = image.canShareFiles()
    if (props.intent === 'save' || props.intent === 'share') {
      await nextTick()
      await deliver(all(), props.intent === 'share')
    }
  },
  // Loaded lazily, the story mounts already open.
  { immediate: true },
)
</script>

<template>
  <Teleport to="#teleports">
    <Transition name="stories" appear>
      <div v-if="open" ref="overlayRef" class="stories" @click.self="emit('close')">
        <section
          ref="panelRef"
          tabindex="-1"
          class="stories__frame"
          :class="{ 'is-holding': gestures.holding.value, 'is-dragging': gestures.dragY.value !== null }"
          :style="gestures.frameStyle.value"
          role="dialog"
          aria-modal="true"
          :aria-label="t('story.title')"
          @keydown="onKeydown"
        >
          <div class="stories__stage" v-on="gestures.handlers">
            <StoryFrame :key="current.key" :frame="current" :who="who" />
          </div>

          <div class="stories__top">
            <div
              class="stories__progress"
              role="progressbar"
              aria-valuemin="1"
              :aria-valuemax="frames.length"
              :aria-valuenow="index + 1"
              :aria-label="label"
            >
              <span v-for="(item, position) in frames" :key="item.key" class="stories__segment">
                <span
                  v-if="position === index"
                  :key="`fill-${index}`"
                  class="stories__fill is-active"
                  :style="{ animationDuration: `${FRAME_MS}ms`, animationPlayState: waiting ? 'paused' : 'running' }"
                  @animationend="onSegmentDone"
                />
                <span v-else class="stories__fill" :class="{ 'is-done': position < index }" />
              </span>
            </div>
            <div class="stories__bar">
              <p class="stories__label" aria-hidden="true">{{ label }}</p>
              <UiIconButton
                tone="poster"
                :icon="userPaused ? Play : Pause"
                :label="userPaused ? t('story.play') : t('story.pause')"
                :aria-pressed="userPaused"
                no-tooltip
                @click="userPaused = !userPaused"
              />
              <UiIconButton tone="poster" :icon="X" :label="t('common.close')" no-tooltip @click="emit('close')" />
            </div>
          </div>

          <div class="stories__actions">
            <UiButton
              variant="poster-soft"
              size="lg"
              :icon="Download"
              :disabled="image.busy.value"
              @click="deliver([index], false)"
            >
              {{ t('story.saveSlide') }}
            </UiButton>
            <UiButton
              variant="poster-soft"
              size="lg"
              :icon="Share"
              :loading="image.busy.value"
              @click="deliver([index], true)"
            >
              {{ t('story.share') }}
            </UiButton>
          </div>
        </section>

        <UiIconButton
          class="stories__arrow stories__arrow--prev"
          tone="chrome"
          :icon="ChevronLeft"
          :label="t('story.previous')"
          :disabled="index === 0"
          no-tooltip
          @click="go(-1)"
        />
        <UiIconButton
          class="stories__arrow stories__arrow--next"
          tone="chrome"
          :icon="ChevronRight"
          :label="t('story.next')"
          :disabled="index === frames.length - 1"
          no-tooltip
          @click="go(1)"
        />

        <!-- The exact 9:16 copy a picture is made from, off screen. -->
        <div v-if="exportIndex !== null" ref="exportRef" class="stories__export" aria-hidden="true">
          <StoryFrame :frame="frames[exportIndex]!" :who="who" still />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.stories {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  background: var(--story-backdrop);
}

/* A phone: the frame is the screen. */
.stories__frame {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--poster);
  color: var(--on-poster);
  transition: transform var(--duration-sheet) var(--ease-drawer);
}

.stories__frame:focus {
  outline: none;
}

.stories__frame.is-dragging {
  border-radius: var(--radius-xl);
}

.stories__stage {
  position: absolute;
  inset: 0;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.stories__top {
  position: absolute;
  inset: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: calc(var(--space-3) + env(safe-area-inset-top, 0px)) var(--page-gutter) 0;
  pointer-events: none;
  transition: opacity var(--transition-fast);
}

.stories__progress {
  display: flex;
  gap: var(--space-1);
}

.stories__segment {
  flex: 1;
  height: var(--space-1);
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--on-poster-faint);
}

.stories__fill {
  display: block;
  width: 0;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--on-poster);
}

.stories__fill.is-done {
  width: 100%;
}

.stories__fill.is-active {
  animation: story-fill linear forwards;
}

@keyframes story-fill {
  to {
    width: 100%;
  }
}

.stories__bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.stories__bar > :deep(*) {
  pointer-events: auto;
}

.stories__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font: var(--text-ui);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stories__actions {
  position: absolute;
  inset: auto 0 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  padding: 0 var(--page-gutter) calc(var(--space-8) + env(safe-area-inset-bottom, 0px));
  transition: opacity var(--transition-fast);
}

/* Reading with a finger held down: the controls step aside. */
.stories__frame.is-holding .stories__top,
.stories__frame.is-holding .stories__actions {
  opacity: 0;
}

.stories__arrow {
  display: none;
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
  transition: opacity var(--transition-fast);
}

.stories-enter-from,
.stories-leave-to {
  opacity: 0;
}

/* Wider screens: a 9:16 frame in the middle of a dark room, arrows beside it. */
@media (min-width: 641px) {
  .stories {
    grid-template-columns: 1fr auto 1fr;
    gap: var(--space-6);
    padding: var(--space-6);
  }

  .stories__frame {
    grid-column: 2;
    width: auto;
    height: min(100%, 844px);
    aspect-ratio: 9 / 16;
    border-radius: var(--radius-xl);
  }

  .stories__arrow {
    display: inline-flex;
  }

  .stories__arrow--prev {
    grid-column: 1;
    grid-row: 1;
    justify-self: end;
  }

  .stories__arrow--next {
    grid-column: 3;
    grid-row: 1;
    justify-self: start;
  }
}
</style>
