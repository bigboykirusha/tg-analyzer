<script setup lang="ts">
import { X } from '../../lib/icons'
import IconButton from './IconButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    closeLabel?: string
    /** sm 400 · md 520 · lg 680. */
    size?: 'sm' | 'md' | 'lg'
    /** Blocks closing while an action runs. */
    busy?: boolean
    role?: 'dialog' | 'alertdialog'
    /** Element to focus first, e.g. «Cancel» in confirmations. */
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
useFocusTrap(panelRef, open, { onEscape: close, initial: () => props.initialFocus?.() })
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-backdrop" @click.self="close">
        <section
          ref="panelRef"
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
          <header class="modal-header">
            <div :id="titleId">
              <slot name="header">
                <h2 class="t-title">{{ title }}</h2>
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
  backdrop-filter: blur(var(--blur-sm));
}

.modal-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
  max-height: min(84dvh, 760px);
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--surface-raised);
  box-shadow: var(--shadow-overlay);
}

.modal-panel--md {
  max-width: 520px;
}

.modal-panel--lg {
  max-width: 680px;
}

.modal-close {
  position: absolute;
  z-index: 1;
  top: var(--space-4);
  right: var(--space-4);
}

.modal-header {
  display: grid;
  flex: 0 0 auto;
  justify-items: start;
  gap: var(--space-1);
  padding: var(--space-6) var(--space-16) var(--space-4) var(--space-6);
}

.modal-description {
  color: var(--text-muted);
  font: var(--text-ui);
  font-weight: 400;
}

.modal-body {
  display: grid;
  gap: var(--space-4);
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 var(--space-6) var(--space-2);
}

.modal-actions {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6) var(--space-6);
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
  transform: translateY(8px) scale(0.98);
}

/* Phones: the dialog becomes a bottom sheet. */
@media (max-width: 640px) {
  .modal-backdrop {
    align-items: end;
    padding: 0;
  }

  .modal-panel,
  .modal-panel--md,
  .modal-panel--lg {
    max-width: none;
    max-height: 86dvh;
    border-width: 0;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }

  .modal-header {
    padding: var(--space-6) var(--space-16) var(--space-4) var(--space-5);
  }

  .modal-body {
    padding-inline: var(--space-5);
  }

  .modal-actions {
    flex-direction: column-reverse;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-5) max(var(--space-5), env(safe-area-inset-bottom));
  }

  .modal-actions :deep(.btn) {
    width: 100%;
    min-height: var(--control-lg);
  }

  .modal-enter-active .modal-panel,
  .modal-leave-active .modal-panel {
    transition: transform var(--transition-slow);
  }

  .modal-enter-from .modal-panel,
  .modal-leave-to .modal-panel {
    transform: translateY(100%);
  }
}
</style>
