<script setup lang="ts">
import { ArrowLeft, X } from '../../lib/icons'

/**
 * The phone sheet (Select, PopoverMenu, «Новый анализ», «Поделиться»; ModalDialog shares its drag through
 * useSheetDrag): edge to edge, attached to the bottom, a grabber, then a 44 bar — back (in a second step) on the
 * left, the title in the middle, close on the right (13.11: a sheet without a «Done» keeps its close at the end,
 * like Apple's share sheet). Closes on a flick, the scrim or Esc.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    /** Role of the panel; menus and listboxes put their own role on the body. */
    role?: 'dialog' | 'alertdialog'
    busy?: boolean
    /** A second step: a back button on the left; close stays on the right. */
    back?: boolean
    /** The whole screen, a page of its own (14.11): no grabber, no corners, under the status bar — a long list (the chats). */
    full?: boolean
  }>(),
  { title: '', role: 'dialog', busy: false, back: false, full: false },
)

const emit = defineEmits<{ close: []; back: [] }>()
const { t } = useI18n()
const panelRef = ref<HTMLElement | null>(null)
const titleId = useId()
const open = toRef(props, 'open')
function close() {
  if (props.busy) return false
  emit('close')
  return true
}

useBodyScrollLock(open)
// The sheet itself takes focus: a search field first would pop the keyboard over the list on a phone.
useFocusTrap(panelRef, open, { onEscape: close, initial: () => panelRef.value })
const drag = useSheetDrag(panelRef, close)
watch(open, (value) => value && drag.reset())
</script>

<template>
  <Teleport to="#teleports">
    <Transition name="sheet" appear>
      <div v-if="open" class="sheet-scrim" :class="{ 'sheet-scrim--full': full }" @click.self="close">
        <div class="sheet-dim" aria-hidden="true" />
        <section
          ref="panelRef"
          tabindex="-1"
          class="sheet"
          :role="role"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
        >
          <div class="sheet__drag" v-on="drag.handlers">
            <span class="sheet__grabber" aria-hidden="true" />
            <header v-if="title || $slots.header" class="sheet__head">
              <UiIconButton v-if="back" :label="t('common.back')" :icon="ArrowLeft" no-tooltip @click="emit('back')" />
              <span v-else aria-hidden="true" />
              <slot name="header">
                <h2 :id="titleId" class="sheet__title">{{ title }}</h2>
              </slot>
              <UiIconButton :label="t('common.close')" :icon="X" no-tooltip @click="close" />
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
/* The same sheet as a dialog on a phone (ModalDialog): edge to edge, attached to the bottom, top corners round. */
.sheet-scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  padding: var(--space-12) 0 0;
}

/* The scrim is its own layer that only fades (opacity), a little taller than the screen: nothing shows under the
   edge while Safari's toolbar moves. */
.sheet-dim {
  position: absolute;
  inset: 0 0 calc(-1 * var(--space-12));
  background: var(--scrim);
  pointer-events: none;
}

/* One box, always: the sheet is never resized, restyled or re-laid out while it travels, it only moves. */
.sheet {
  --field-bg: var(--fill-raised);
  /* Lists in a sheet or a dialog sit straight on it: no card inside a card. */
  --group-bg: transparent;
  --group-ring: none;
  --group-radius: 0;
  --group-inset: var(--page-gutter);
  --group-bleed: var(--page-gutter);
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 100%;
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  background: var(--surface-raised);
  box-shadow: var(--shadow-overlay);
  /* A finger writes --sheet-drag once a frame (useSheetDrag); let go, it settles back on the drawer curve. */
  transform: translate3d(0, var(--sheet-drag, 0px), 0);
  transition: transform var(--duration-sheet) var(--ease-drawer);
}

/* The sheet's surface goes on below its edge: whatever the toolbar does, no page shows under it. */
.sheet::after {
  content: '';
  position: absolute;
  top: calc(100% - 1px);
  right: 0;
  left: 0;
  height: 100vh;
  background: var(--surface-raised);
  pointer-events: none;
}

.sheet__drag {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  touch-action: none;
}

.sheet__grabber {
  align-self: center;
  width: var(--control-sm);
  height: var(--space-1);
  margin: var(--space-2) 0;
  border-radius: var(--radius-pill);
  background: var(--border-strong);
}

.sheet__head {
  display: grid;
  grid-template-columns: var(--control-md) minmax(0, 1fr) var(--control-md);
  align-items: center;
  gap: var(--space-2);
  min-height: var(--control-md);
  padding: 0 var(--page-gutter) var(--space-3);
}

.sheet__title {
  overflow: hidden;
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet__search {
  flex: 0 0 auto;
  padding: 0 var(--page-gutter) var(--space-3);
}

.sheet__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 var(--page-gutter) var(--space-4);
}

.sheet__foot {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) var(--page-gutter) var(--space-4);
}

.sheet__foot :deep(.btn) {
  width: 100%;
}

/* The last block keeps the sheet's own margin and clears the home indicator. */
.sheet__body:last-child,
.sheet__foot {
  padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
}

/* Vue reads the length of the animation off this root, so it carries a transition of its own (nothing changes on it:
   the scrim is the fading child, the sheet the moving one). */
.sheet-enter-active {
  transition: opacity var(--duration-sheet);
}

.sheet-leave-active {
  transition: opacity var(--duration-fast);
  pointer-events: none;
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  will-change: transform;
}

.sheet-enter-active .sheet {
  transition: transform var(--duration-sheet) var(--ease-drawer);
}

.sheet-leave-active .sheet {
  transition: transform var(--transition-exit);
}

.sheet-enter-active .sheet-dim {
  transition: opacity var(--duration-sheet) var(--ease-drawer);
}

.sheet-leave-active .sheet-dim {
  transition: opacity var(--duration-fast) var(--ease-exit);
}

.sheet-enter-active .sheet-dim,
.sheet-leave-active .sheet-dim {
  will-change: opacity;
}

.sheet-enter-from .sheet-dim,
.sheet-leave-to .sheet-dim {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translate3d(0, calc(100% + var(--space-4)), 0);
}

/* Full: the whole screen, one surface up to the status bar — no grabber, no corners, no edge (14.11). It still
   closes by a pull of its head. */
.sheet-scrim--full {
  padding-top: 0;
}

.sheet-scrim--full .sheet {
  height: 100%;
  padding-top: env(safe-area-inset-top, 0px);
  border-radius: 0;
  box-shadow: none;
}

.sheet-scrim--full .sheet__grabber {
  visibility: hidden;
}

/* Reduced motion: no travel, the sheet fades in place. */
@media (prefers-reduced-motion: reduce) {
  .sheet-enter-from .sheet,
  .sheet-leave-to .sheet {
    opacity: 0;
    transform: translate3d(0, var(--sheet-drag, 0px), 0);
  }

  .sheet-enter-active .sheet,
  .sheet-leave-active .sheet {
    transition-property: opacity;
  }
}
</style>
