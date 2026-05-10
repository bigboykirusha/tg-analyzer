<script setup lang="ts">
import Button from './Button.vue'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  variant?: 'default' | 'danger'
  loading?: boolean
}>(), {
  variant: 'default',
  loading: false,
})

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

watch(() => props.open, (open) => {
  if (!import.meta.client) {
    return
  }
  document.body.style.overflow = open ? 'hidden' : ''
}, { immediate: true })

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
        <section
          class="dialog-panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`confirm-title-${title}`"
        >
          <div class="dialog-copy">
            <h2 :id="`confirm-title-${title}`" class="text-h3">{{ title }}</h2>
            <p class="text-body-sm">{{ description }}</p>
          </div>

          <div class="dialog-actions">
            <Button variant="secondary" :disabled="loading" @click="close">
              {{ cancelLabel }}
            </Button>
            <Button
              :variant="variant === 'danger' ? 'danger' : 'primary'"
              :loading="loading"
              @click="emit('confirm')"
            >
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

.dialog-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
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
  transition: opacity var(--transition-base);
}

.dialog-enter-active .dialog-panel,
.dialog-leave-active .dialog-panel {
  transition: transform var(--transition-base);
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
    align-items: flex-end;
    padding: var(--space-3);
  }

  .dialog-panel {
    padding: var(--space-4);
  }

  .dialog-actions {
    flex-direction: column-reverse;
  }
}
</style>
