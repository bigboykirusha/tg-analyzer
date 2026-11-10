<script setup lang="ts">
import { ArrowLeft, X } from '../../lib/icons'

/**
 * The phone sheet (Select, PopoverMenu, «Новый анализ», «Поделиться»; ModalDialog shares its drag through
 * useSheetDrag): edge to edge, attached to the bottom, a grabber, then a 44 bar — close (or back) on the
 * left, the title in the middle, an optional action on the right. Closes on a flick, the scrim or Esc.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    /** Role of the panel; menus and listboxes put their own role on the body. */
    role?: 'dialog' | 'alertdialog'
    busy?: boolean
    /** A second step: the left button goes back instead of closing. */
    back?: boolean
  }>(),
  { title: '', role: 'dialog', busy: false, back: false },
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
    <Transition name="sheet">
      <div v-if="open" class="sheet-scrim" @click.self="close">
        <section
          ref="panelRef"
          tabindex="-1"
          class="sheet"
          :role="role"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          :class="{ 'is-dragging': drag.dragging.value }"
          :style="drag.style.value"
        >
          <div class="sheet__drag" v-on="drag.handlers">
            <span class="sheet__grabber" aria-hidden="true" />
            <header v-if="title || $slots.header" class="sheet__head">
              <UiIconButton
                v-if="back"
                :label="t('common.back')"
                :icon="ArrowLeft"
                tone="chrome"
                size="lg"
                no-tooltip
                @click="emit('back')"
              />
              <UiIconButton
                v-else
                :label="t('common.close')"
                :icon="X"
                tone="chrome"
                size="lg"
                no-tooltip
                @click="close"
              />
              <slot name="header">
                <h2 :id="titleId" class="sheet__title">{{ title }}</h2>
              </slot>
              <span class="sheet__end"><slot name="end" /></span>
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
  background: var(--scrim);
}

.sheet {
  --field-bg: var(--fill-raised);
  --btn-fill: var(--fill-raised);
  --btn-segment-on: var(--surface-raised);
  /* Lists in a sheet or a dialog sit straight on it: no card inside a card. */
  --group-bg: transparent;
  --group-padding: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 100%;
  overflow: hidden;
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  background: var(--surface-raised);
  box-shadow: var(--shadow-overlay);
  transform: translateY(var(--sheet-drag, 0));
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
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet__end {
  display: flex;
  justify-content: flex-end;
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

.sheet-enter-active,
.sheet-leave-active {
  /* Only the scrim fades: the sheet is solid material that slides, never a ghost. */
  transition: background-color var(--duration-sheet) var(--ease-drawer);
}

.sheet-leave-active {
  transition-duration: var(--duration-fast);
}

.sheet-enter-active .sheet {
  transition: transform var(--duration-sheet) var(--ease-drawer);
}

.sheet-leave-active .sheet {
  transition: transform var(--transition-exit);
}

.sheet-enter-from,
.sheet-leave-to {
  background-color: transparent;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(calc(100% + var(--space-4)));
}

/* Reduced motion: no travel, the sheet fades in place. */
@media (prefers-reduced-motion: reduce) {
  .sheet-enter-from .sheet,
  .sheet-leave-to .sheet {
    opacity: 0;
    transform: translateY(var(--sheet-drag, 0));
  }
}
</style>
