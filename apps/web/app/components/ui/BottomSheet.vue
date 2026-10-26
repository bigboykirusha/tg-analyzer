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
let dragStart: number | null = null

function close() {
  if (!props.busy) emit('close')
}

useBodyScrollLock(open)
useFocusTrap(panelRef, open, { onEscape: close })

function onPointerDown(event: PointerEvent) {
  dragStart = event.clientY
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (dragStart === null) return
  dragOffset.value = Math.max(0, event.clientY - dragStart)
}

function onPointerUp() {
  if (dragStart === null) return
  const height = panelRef.value?.offsetHeight ?? 0
  if (height && dragOffset.value > height * 0.3) close()
  dragStart = null
  dragOffset.value = 0
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-scrim" @click.self="close">
        <section
          ref="panelRef"
          class="sheet"
          :role="role"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          :style="dragOffset ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : undefined"
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
.sheet-scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  background: var(--scrim);
  backdrop-filter: blur(var(--blur-sm));
}

.sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 86dvh;
  overflow: hidden;
  border-radius: var(--radius-card) var(--radius-card) 0 0;
  background: var(--surface-raised);
  box-shadow: var(--shadow-overlay);
  transition: transform var(--transition-slow);
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
  padding: var(--space-3) var(--space-5) max(var(--space-5), env(safe-area-inset-bottom));
}

.sheet__foot :deep(.btn) {
  width: 100%;
  min-height: var(--control-lg);
}

/* Without actions the list itself reaches the safe area. */
.sheet__body:last-child {
  padding-bottom: max(var(--space-3), env(safe-area-inset-bottom));
}

/* Options and menu items are 48px / 15px inside a sheet. */
.sheet__body :deep(.menu-item),
.sheet__body :deep(.option) {
  min-height: var(--control-lg);
  font-size: 15px;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity var(--transition-normal);
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform var(--transition-slow);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>
