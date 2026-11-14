<script setup lang="ts">
import { ArrowLeft, X } from '../../lib/icons'
import IconButton from './IconButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    closeLabel?: string
    /** sm 420 · md 520 · lg 680 (--dialog-*). */
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
const drag = useSheetDrag(panelRef, close)
watch(open, (value) => value && drag.reset())
</script>

<template>
  <Teleport to="#teleports">
    <Transition name="modal" appear>
      <div v-if="open" class="modal-backdrop" @click.self="close">
        <section
          ref="panelRef"
          tabindex="-1"
          class="modal-panel"
          :class="[
            `modal-panel--${size}`,
            {
              'is-dragging': drag.dragging.value,
              'modal-panel--alert': role === 'alertdialog',
              'modal-panel--aside': $slots.aside,
              'modal-panel--back': back,
            },
          ]"
          :role="role"
          aria-modal="true"
          :aria-labelledby="title || $slots.header ? titleId : undefined"
          :aria-describedby="description ? descriptionId : undefined"
          :style="drag.style.value"
        >
          <div class="modal-grab" aria-hidden="true" v-on="drag.handlers">
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
          <header class="modal-header">
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
 * `aside` (a picture) stands on the left at the dialog's full height.
 * Phones (≤ 640): the same content as a sheet — edge to edge, attached to the bottom, a grabber, the
 * back circle (a second step) on the left, the title in the middle, close on the right, actions stacked full width, the
 * main one on top. A confirmation (alertdialog) has no close button and a left-aligned title.
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
  z-index: 1;
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
.modal-panel--aside {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-auto-rows: min-content;
  align-content: start;
  column-gap: var(--space-6);
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

.modal-panel:focus {
  outline: none;
}

@media (max-width: 640px) {
  .modal-backdrop {
    align-items: end;
    padding: var(--space-12) 0 0;
  }

  .modal-panel {
    --group-inset: var(--page-gutter);
    --group-bleed: var(--page-gutter);
    max-width: none;
    max-height: 100%;
    padding: 0 var(--page-gutter) calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
    border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
    transform: translateY(var(--sheet-drag, 0));
    transition: transform var(--duration-sheet) var(--ease-drawer);
  }

  .modal-panel.is-dragging {
    transition: none;
  }

  .modal-grab {
    display: flex;
    justify-content: center;
    padding: var(--space-2) 0 var(--space-1);
    /* The grab strip is 16 tall; the close circle starts right under it and the title row is centred on it. */
    margin-bottom: calc(-1 * var(--space-4));
    touch-action: none;
  }

  .modal-grabber {
    width: var(--control-sm);
    height: var(--space-1);
    border-radius: var(--radius-pill);
    background: var(--border-strong);
  }

  /* Close at the end of the title row, back (a second step) at its start: our sheets confirm at the bottom, so the
     leading place a «Done» would push close into stays free (13.11). */
  .modal-close,
  .modal-back {
    position: absolute;
    top: calc(var(--space-2) + var(--space-1) + var(--space-1));
  }

  .modal-close {
    right: var(--page-gutter);
  }

  .modal-back {
    left: var(--page-gutter);
  }

  .modal-header {
    justify-content: center;
    min-height: var(--control-md);
    padding: 0 calc(var(--control-md) + var(--space-2));
    text-align: center;
  }

  .modal-panel--alert .modal-header {
    justify-content: flex-start;
    padding: var(--space-2) 0 0;
    text-align: left;
  }

  /* The picture pane belongs to wide dialogs: a sheet shows its own compact version in the body. */
  .modal-panel--aside {
    display: flex;
  }

  .modal-aside {
    display: none;
  }

  .modal-body {
    margin: 0 calc(-1 * var(--page-gutter));
    padding: 0 var(--page-gutter);
  }

  /* The main action on top, «Отменить» under it. */
  .modal-actions {
    flex-direction: column-reverse;
    flex-wrap: nowrap;
  }

  .modal-actions :deep(.btn) {
    width: 100%;
  }

  .modal-enter-active .modal-panel,
  .modal-leave-active .modal-panel {
    opacity: 1;
  }

  .modal-enter-from .modal-panel,
  .modal-leave-to .modal-panel {
    opacity: 1;
    transform: translateY(calc(100% + var(--space-4)));
  }
}

@media (max-width: 640px) and (prefers-reduced-motion: reduce) {
  .modal-enter-from .modal-panel,
  .modal-leave-to .modal-panel {
    opacity: 0;
    transform: none;
  }
}
</style>
