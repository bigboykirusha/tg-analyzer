<script setup lang="ts">
import { ArrowLeft, X } from '../../lib/icons'
import IconButton from './IconButton.vue'
import { tokenMs } from '../../lib/sheetMotion'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    closeLabel?: string
    /** sm 440 · md 520 · lg 680 (--dialog-*). */
    size?: 'sm' | 'md' | 'lg'
    /** Blocks closing while an action runs. */
    busy?: boolean
    role?: 'dialog' | 'alertdialog'
    /** A second step: a back button beside the title (on a phone at the start of the title row, close stays at its end). */
    back?: boolean
    /** Element to focus first; by default the dialog itself, so no button looks pre-selected. */
    initialFocus?: () => HTMLElement | null | undefined
  }>(),
  {
    title: '',
    closeLabel: '',
    description: '',
    size: 'sm',
    busy: false,
    role: 'dialog',
    back: false,
    initialFocus: undefined,
  },
)

const emit = defineEmits<{ close: []; back: [] }>()
const { t } = useI18n()
const panelRef = ref<HTMLElement | null>(null)
const layerRef = ref<HTMLElement | null>(null)
const titleId = useId()
const descriptionId = useId()
const open = toRef(props, 'open')

function close() {
  if (props.busy) return false
  emit('close')
  return true
}

useBodyScrollLock(open)
useFocusTrap(panelRef, open, { onEscape: close, initial: () => props.initialFocus?.() ?? panelRef.value })
// Phones show the dialog as a sheet, and a sheet answers the finger: grab its top and pull it down.
const isSheet = useMediaQuery('(max-width: 640px)')
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const drag = useSheetDrag(panelRef, { root: layerRef, onRelease: (toRest) => !toRest || close() })
useVisualViewportFit(
  layerRef,
  computed(() => open.value && isSheet.value),
)
watch(open, (value) => value && drag.reset())
const grab = computed(() => (isSheet.value ? drag.handlers : {}))
</script>

<template>
  <Teleport to="#teleports">
    <Transition
      :name="isSheet ? 'sheet' : 'modal'"
      appear
      :duration="reducedMotion ? 0 : { enter: tokenMs('--duration-sheet'), leave: tokenMs('--duration-fast', 150) }"
    >
      <div v-if="open" ref="layerRef" :class="isSheet ? 'sheet-layer' : 'modal-backdrop'" @click.self="close">
        <template v-if="isSheet">
          <div class="sheet-dim" aria-hidden="true" />
          <div class="sheet-under" aria-hidden="true" />
        </template>
        <section
          ref="panelRef"
          tabindex="-1"
          class="modal-panel"
          :class="[
            `modal-panel--${size}`,
            {
              'modal-panel--sheet sheet-surface': isSheet,
              'modal-panel--alert': role === 'alertdialog',
              'modal-panel--aside': $slots.aside,
              'modal-panel--back': back,
            },
          ]"
          :role="role"
          aria-modal="true"
          :aria-labelledby="title || $slots.header ? titleId : undefined"
          :aria-describedby="description ? descriptionId : undefined"
        >
          <div class="modal-grab" aria-hidden="true" v-on="grab">
            <span class="modal-grabber" />
          </div>
          <IconButton
            v-if="role !== 'alertdialog'"
            class="modal-close"
            :label="closeLabel || t('common.close')"
            :icon="X"
            size="md"
            no-tooltip
            :disabled="busy"
            @click="close"
          />
          <div v-if="$slots.aside" class="modal-aside">
            <slot name="aside" />
          </div>
          <header class="modal-header" v-on="grab">
            <IconButton
              v-if="back"
              class="modal-back"
              :label="t('common.back')"
              :icon="ArrowLeft"
              size="md"
              no-tooltip
              @click="emit('back')"
            />
            <div class="modal-header__copy">
              <div :id="titleId">
                <slot name="header">
                  <h2 class="modal-title">{{ title }}</h2>
                </slot>
              </div>
              <p v-if="description" :id="descriptionId" class="modal-description">{{ description }}</p>
            </div>
          </header>

          <div v-if="$slots.default" class="modal-body">
            <slot />
          </div>

          <footer v-if="$slots.actions" class="modal-actions">
            <slot name="actions" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/*
 * Desktop: a dialog in the middle — 32 corners, 24 padding, the title in h3, actions at the end; an
 * "aside" slot (a picture) stands on the left at the dialog's full height.
 * Phones (≤ 640, modal-panel--sheet): the same content as a sheet (base.css, one box with BottomSheet) — edge to
 * edge, attached to the bottom, a grabber, the back circle (a second step) on the left, the title in the middle, close
 * on the right, actions stacked full width, the main one on top. A confirmation (alertdialog) has no close button and
 * a left-aligned title.
 */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background: var(--scrim);
}

.modal-panel {
  --field-bg: var(--fill-raised);
  /* Lists in a sheet or a dialog sit straight on it: no card inside a card. */
  --group-bg: transparent;
  --group-ring: none;
  --group-radius: 0;
  --group-inset: var(--space-6);
  --group-bleed: var(--space-6);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  isolation: isolate;
  width: 100%;
  max-width: var(--dialog-sm);
  max-height: 84dvh;
  overflow: hidden;
  padding: var(--space-6);
  border-radius: var(--radius-sheet);
  background: var(--surface-raised);
  box-shadow: var(--shadow-overlay);
}

.modal-panel--md {
  max-width: var(--dialog-md);
}

.modal-panel--lg {
  max-width: var(--dialog-lg);
}

.modal-grab {
  display: none;
}

.modal-close {
  position: absolute;
  top: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-raise);
}

/* The title row is as tall as the close circle and centred on it. */
.modal-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--control-md);
  padding-right: calc(var(--control-md) + var(--space-2));
}

.modal-panel--alert .modal-header {
  padding-right: 0;
}

.modal-header__copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

/* A picture pane on the left, the dialog's own column on the right. */
/*
 * One height for every step (17.11: «Поделиться» jumped as its steps changed): the picture sets it, the column
 * scrolls inside.
 */
.modal-panel--aside {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-columns: auto minmax(0, 1fr);
  align-content: stretch;
  column-gap: var(--space-6);
  /* 13 steps: the link step (preview, two switches, copy and its note) fits without a hidden scroll. */
  height: min(84dvh, calc(var(--space-12) * 13));
}

.modal-aside {
  display: flex;
  grid-row: 1 / span 3;
  min-width: 0;
}

.modal-panel--aside > :not(.modal-aside, .modal-close, .modal-grab) {
  grid-column: 2;
}

.modal-title {
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
  text-wrap: balance;
}

.modal-description {
  color: var(--text-muted);
  font: var(--text-label);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
  min-height: 0;
  margin: 0 calc(-1 * var(--space-6));
  padding: 0 var(--space-6);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.modal-actions {
  display: flex;
  flex-wrap: wrap-reverse;
  justify-content: flex-end;
  gap: var(--space-2);
  padding-top: var(--space-2);
}

.modal-backdrop.modal-enter-active,
.modal-backdrop.modal-leave-active {
  transition: background-color var(--duration-fast) var(--ease-standard);
}

.modal-enter-active .modal-panel {
  transition:
    opacity var(--duration-fast) var(--ease-standard),
    transform var(--duration-sheet) var(--spring-snappy);
}

.modal-leave-active .modal-panel {
  transition:
    opacity var(--transition-exit),
    transform var(--transition-exit);
}

.modal-enter-from,
.modal-leave-to {
  background-color: transparent;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  opacity: 0;
  transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-from .modal-panel,
  .modal-leave-to .modal-panel {
    transform: none;
  }
}

.modal-panel:focus {
  outline: none;
}

/* The phone sheet. The panel has no gap: each part carries its own space, so nothing is pulled back by a negative
   margin. */
.modal-panel--sheet {
  --group-inset: var(--page-gutter);
  --group-bleed: var(--page-gutter);
  gap: 0;
  max-width: none;
  max-height: 100%;
  padding: 0 var(--page-gutter) calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
}

.modal-panel--sheet .modal-grab {
  display: flex;
  justify-content: center;
  touch-action: none;
}

/* The grabber of a BottomSheet: 8 above and below it; the header and the close circle start under it. */
.modal-panel--sheet .modal-grabber {
  width: var(--control-sm);
  height: var(--space-1);
  margin: var(--space-2) 0;
  border-radius: var(--radius-pill);
  background: var(--border-strong);
}

/* Close at the end of the title row, back (a second step) at its start: our sheets confirm at the bottom, so the
   leading place a «Done» would push close into stays free (13.11). */
.modal-panel--sheet .modal-close,
.modal-panel--sheet .modal-back {
  position: absolute;
  top: calc(var(--space-2) + var(--space-1) + var(--space-2));
}

.modal-panel--sheet .modal-close {
  right: var(--page-gutter);
}

.modal-panel--sheet .modal-back {
  left: var(--page-gutter);
}

.modal-panel--sheet .modal-header {
  justify-content: center;
  margin-bottom: calc(var(--space-4) + var(--space-3));
  padding: 0 calc(var(--control-md) + var(--space-2));
  text-align: center;
  touch-action: none;
}

.modal-panel--sheet.modal-panel--alert .modal-header {
  justify-content: flex-start;
  margin: var(--space-4) 0;
  padding: var(--space-2) 0 0;
  text-align: left;
}

/* The picture pane belongs to wide dialogs: a sheet shows its own compact version in the body. */
.modal-panel--sheet.modal-panel--aside {
  display: flex;
}

.modal-panel--sheet .modal-aside {
  display: none;
}

.modal-panel--sheet .modal-body {
  margin: 0 calc(-1 * var(--page-gutter));
  padding: 0 var(--page-gutter);
}

.modal-panel--sheet .modal-body + .modal-actions {
  margin-top: var(--space-4);
}

/* The main action on top, «Отменить» under it. */
.modal-panel--sheet .modal-actions {
  flex-direction: column-reverse;
  flex-wrap: nowrap;
}

.modal-panel--sheet .modal-actions :deep(.btn) {
  width: 100%;
}
</style>
