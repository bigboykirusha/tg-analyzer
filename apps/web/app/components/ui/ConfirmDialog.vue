<script setup lang="ts">
import Button from './Button.vue'
import { X } from '../../lib/icons'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    cancelLabel: string
    variant?: 'default' | 'danger'
    loading?: boolean
  }>(),
  {
    variant: 'default',
    loading: false,
  },
)

const emit = defineEmits<{
  close: []
  confirm: []
}>()

function close() {
  if (!props.loading) {
    emit('close')
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
  }
}

watch(
  () => props.open,
  (open) => {
    if (!import.meta.client) {
      return
    }
    document.body.style.overflow = open ? 'hidden' : ''
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="dialog-backdrop" @click.self="close">
        <section class="dialog-panel" role="dialog" aria-modal="true" :aria-labelledby="`confirm-title-${title}`">
          <button type="button" class="dialog-close" :aria-label="cancelLabel" :disabled="loading" @click="close">
            <X :size="18" :stroke-width="1.5" aria-hidden="true" />
          </button>
          <div class="dialog-copy">
            <h2 :id="`confirm-title-${title}`" class="t-h3">{{ title }}</h2>
            <p class="t-small">{{ description }}</p>
          </div>

          <div class="dialog-actions">
            <Button :variant="variant === 'danger' ? 'danger' : 'primary'" :loading="loading" @click="emit('confirm')">
              {{ confirmLabel }}
            </Button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.64);
}

.dialog-panel {
  position: relative;
  display: flex;
  width: min(100%, 420px);
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-5);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-lg);
}

.dialog-close {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-tertiary);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    opacity var(--transition-fast);
}

.dialog-close:hover:not(:disabled) {
  background: var(--bg-elevated);
  border-color: var(--border-subtle);
  color: var(--text-primary);
}

.dialog-close:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--bg-base),
    0 0 0 4px var(--accent);
}

.dialog-close:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.dialog-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-right: calc(var(--space-6) + var(--space-2));
}

.dialog-copy p {
  color: var(--text-secondary);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity var(--transition-normal);
}

.dialog-enter-active .dialog-panel,
.dialog-leave-active .dialog-panel {
  transition: transform var(--transition-normal);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-panel,
.dialog-leave-to .dialog-panel {
  transform: translateY(8px) scale(0.98);
}

@media (max-width: 520px) {
  .dialog-backdrop {
    align-items: center;
    padding: var(--space-3);
  }

  .dialog-panel {
    padding: var(--space-4);
  }
}
</style>
