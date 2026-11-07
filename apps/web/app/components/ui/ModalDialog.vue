<script setup lang="ts">
import { X } from '../../lib/icons'
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
    initialFocus: undefined,
  },
)

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const panelRef = ref<HTMLElement | null>(null)
const titleId = useId()
const descriptionId = useId()
const open = toRef(props, 'open')

function close() {
  if (!props.busy) emit('close')
}

useBodyScrollLock(open)
useFocusTrap(panelRef, open, { onEscape: close, initial: () => props.initialFocus?.() ?? panelRef.value })
</script>

<template>
  <Teleport to="#teleports">
    <Transition name="modal">
      <div v-if="open" class="modal-backdrop" @click.self="close">
        <section
          ref="panelRef"
          tabindex="-1"
          class="modal-panel"
          :class="`modal-panel--${size}`"
          :role="role"
          aria-modal="true"
          :aria-labelledby="title || $slots.header ? titleId : undefined"
          :aria-describedby="description ? descriptionId : undefined"
        >
          <IconButton
            class="modal-close"
            :label="closeLabel || t('common.close')"
            :icon="X"
            variant="ghost"
            size="xs"
            :disabled="busy"
            @click="close"
          />
          <div v-if="$slots.top" class="modal-top">
            <slot name="top" />
          </div>
          <header class="modal-header">
            <div :id="titleId">
              <slot name="header">
                <h2 class="modal-title">{{ title }}</h2>
              </slot>
            </div>
            <p v-if="description" :id="descriptionId" class="modal-description">{{ description }}</p>
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
  position: relative;
  display: flex;
  flex-direction: column;
  isolation: isolate;
  width: 100%;
  max-width: var(--dialog-sm);
  max-height: 84dvh;
  overflow: hidden;
  border: 0;
  border-radius: var(--radius-xl);
  background: var(--surface-raised);
  box-shadow: var(--shadow-overlay);
}

.modal-panel--md {
  max-width: var(--dialog-md);
}

.modal-panel--lg {
  max-width: var(--dialog-lg);
}

.modal-close {
  position: absolute;
  z-index: 1;
  top: var(--space-4);
  right: var(--space-4);
}

/* Optional subject row (the chat being acted on); the close button sits at its end. */
.modal-top {
  display: flex;
  align-items: center;
  min-height: var(--control-md);
  padding: var(--space-6) var(--space-12) 0 var(--space-6);
}

.modal-header {
  display: grid;
  flex: 0 0 auto;
  justify-items: start;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-12) var(--space-4) var(--space-6);
}

.modal-top + .modal-header {
  padding-top: var(--space-6);
  padding-right: var(--space-6);
}

.modal-title {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  text-wrap: balance;
}

.modal-description {
  color: var(--text-muted);
  font: var(--text-body);
  text-wrap: pretty;
}

.modal-body {
  display: grid;
  gap: var(--space-4);
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 var(--space-6) var(--space-1);
}

/* Two equal buttons side by side: cancel on the left, the action on the right. */
.modal-actions {
  display: grid;
  flex: 0 0 auto;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-6) var(--space-6);
}

.modal-actions :deep(.btn) {
  width: 100%;
  min-height: var(--control-lg);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform var(--transition-normal);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: translateY(var(--space-2)) scale(0.98);
}

/* The dialog takes focus on open without drawing a ring around itself. */
.modal-panel:focus {
  outline: none;
  box-shadow: var(--shadow-overlay);
}

@media (max-width: 640px) {
  /* Phones: the dialog becomes a sheet floating just above the bottom edge. */
  .modal-backdrop {
    align-items: end;
    padding: var(--space-2) var(--space-2) calc(var(--space-2) + env(safe-area-inset-bottom, 0px));
  }

  .modal-panel,
  .modal-panel--md,
  .modal-panel--lg {
    max-width: none;
    max-height: 86dvh;
    border-width: 0;
    border-radius: var(--radius-xl);
  }

  .modal-enter-active .modal-panel,
  .modal-leave-active .modal-panel {
    transition: transform var(--duration-sheet) var(--ease-drawer);
  }

  .modal-enter-from .modal-panel,
  .modal-leave-to .modal-panel {
    transform: translateY(calc(100% + var(--space-4)));
  }
}
</style>
