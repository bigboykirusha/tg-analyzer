<script setup lang="ts">
/**
 * Bottom sheet for phones (≤ 640px): Select, PopoverMenu and ModalDialog open
 * this way. Grabber, title, 48px items, full-width actions; closes on swipe
 * down past 30% of its height, scrim tap or Esc.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    /** Role of the panel; menus and listboxes put their own role on the body. */
    role?: 'dialog' | 'alertdialog'
    busy?: boolean
  }>(),
  { title: '', role: 'dialog', busy: false },
)

const emit = defineEmits<{ close: [] }>()
const panelRef = ref<HTMLElement | null>(null)
const titleId = useId()
const open = toRef(props, 'open')
const dragOffset = ref(0)
const dragging = ref(false)
let dragStart: number | null = null
/** The last few pointer positions, to tell a flick from a slow drag. */
let trail: { y: number; t: number }[] = []

/** A flick faster than this closes the sheet however short it was (px per ms). */
const FLICK_VELOCITY = 0.5
/** Dragged further than this share of its height, the sheet closes on release. */
const CLOSE_SHARE = 0.3

function close() {
  if (!props.busy) emit('close')
}

useBodyScrollLock(open)
useFocusTrap(panelRef, open, { onEscape: close })

function onPointerDown(event: PointerEvent) {
  dragStart = event.clientY
  trail = [{ y: event.clientY, t: event.timeStamp }]
  dragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (dragStart === null) return
  const delta = event.clientY - dragStart
  // Down follows the finger; up resists like rubber, since the sheet has nowhere to go.
  dragOffset.value = delta >= 0 ? delta : -Math.sqrt(-delta) * 2
  trail = [...trail.filter((point) => event.timeStamp - point.t < 100), { y: event.clientY, t: event.timeStamp }]
}

function onPointerUp() {
  if (dragStart === null) return
  const height = panelRef.value?.offsetHeight ?? 0
  const first = trail[0]
  const last = trail.at(-1)
  const velocity = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0
  const closing =
    dragOffset.value > 0 && (velocity > FLICK_VELOCITY || (height && dragOffset.value > height * CLOSE_SHARE))
  dragStart = null
  dragging.value = false
  // Either way the inline offset goes: closing slides on from here, staying springs back.
  dragOffset.value = 0
  if (closing) close()
}
</script>

<template>
  <Teleport to="#teleports">
    <Transition name="sheet">
      <div v-if="open" class="sheet-scrim" @click.self="close">
        <section
          ref="panelRef"
          tabindex="-1"
          class="sheet"
          :role="role"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          :class="{ 'is-dragging': dragging }"
          :style="dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined"
        >
          <div
            class="sheet__drag"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <span class="sheet__grabber" aria-hidden="true" />
            <header v-if="title || $slots.header" class="sheet__head">
              <slot name="header">
                <h2 :id="titleId" class="t-title">{{ title }}</h2>
              </slot>
            </header>
          </div>
          <div v-if="$slots.search" class="sheet__search">
            <slot name="search" />
          </div>
          <div class="sheet__body">
            <slot />
          </div>
          <footer v-if="$slots.actions" class="sheet__foot">
            <slot name="actions" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* The same floating sheet as a dialog on a phone (ModalDialog): inset from the edges, all corners round. */
.sheet-scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  padding: var(--space-2) var(--space-2) calc(var(--space-2) + env(safe-area-inset-bottom, 0px));
  background: var(--scrim);
}

.sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 86dvh;
  overflow: hidden;
  border-radius: var(--radius-xl);
  background: var(--surface-raised);
  box-shadow: var(--shadow-overlay);
  /* Let go, it settles back on the drawer curve. */
  transition: transform var(--duration-sheet) var(--ease-drawer);
}

.sheet.is-dragging {
  transition: none;
}

.sheet__drag {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  touch-action: none;
}

.sheet__grabber {
  align-self: center;
  width: 36px;
  height: 4px;
  margin: var(--space-2) 0 var(--space-1);
  border-radius: var(--radius-full);
  background: var(--border-strong);
}

.sheet__head {
  padding: var(--space-3) var(--space-5) var(--space-2);
  overflow-wrap: anywhere;
}

.sheet__search {
  flex: 0 0 auto;
  padding: var(--space-1) var(--space-3) var(--space-2);
}

.sheet__body {
  display: grid;
  gap: var(--space-1);
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 var(--space-3) var(--space-3);
}

.sheet__foot {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5) var(--space-5);
}

.sheet__foot :deep(.btn) {
  width: 100%;
  min-height: var(--control-lg);
}

/* The scrim keeps the sheet above the safe area, so the last block needs only its own padding. */
.sheet__body:last-child {
  padding-bottom: var(--space-3);
}

/* Options and menu items are 48px / 15px inside a sheet. */
.sheet__body :deep(.menu-item),
.sheet__body :deep(.option) {
  min-height: var(--control-lg);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity var(--transition-normal);
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform var(--duration-sheet) var(--ease-drawer);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(calc(100% + var(--space-4)));
}
</style>
