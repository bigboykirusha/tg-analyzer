<script setup lang="ts">
/**
 * Bottom sheet for phones (≤ 640px): Select and PopoverMenu open this way
 * (ModalDialog shares its drag through `useSheetDrag`). Grabber, title, 48px items,
 * full-width actions; closes on a flick or a drag past 30% of its height, scrim tap or Esc.
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
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 100%;
  overflow: hidden;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
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
  margin: var(--space-2) 0 var(--space-1);
  border-radius: var(--radius-full);
  background: var(--border-strong);
}

.sheet__head {
  padding: var(--space-3) var(--space-6) var(--space-2);
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
  padding: var(--space-3) var(--space-6) var(--space-6);
}

.sheet__foot :deep(.btn) {
  width: 100%;
  min-height: var(--control-lg);
}

/* The last block keeps the sheet's own margin and clears the home indicator. */
.sheet__body:last-child,
.sheet__foot {
  padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
}

/* Options and menu items (UiListRow) are 48 px tall inside a sheet: a thumb, not a pointer. */
.sheet__body :deep(.menu-item),
.sheet__body :deep(.option) {
  --row-height: var(--control-lg);
}

.sheet-enter-active,
.sheet-leave-active {
  /* Only the scrim fades: the sheet is solid material that slides, never a ghost. */
  transition: background-color var(--duration-sheet) var(--ease-drawer);
}

.sheet-leave-active {
  transition-duration: var(--duration-slow);
}

.sheet-enter-active .sheet {
  transition: transform var(--duration-sheet) var(--ease-drawer);
}

.sheet-leave-active .sheet {
  transition: transform var(--duration-slow) var(--ease-drawer);
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
