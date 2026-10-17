<script setup lang="ts">
import { X } from '../../lib/icons'
import IconButton from './IconButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    closeLabel?: string
    size?: 'sm' | 'md' | 'lg'
    busy?: boolean
  }>(),
  {
    title: '',
    closeLabel: '',
    description: '',
    size: 'md',
    busy: false,
  },
)

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const panelRef = ref<HTMLElement | null>(null)
const titleId = useId()
const descriptionId = useId()
useBodyScrollLock(toRef(props, 'open'))
let previouslyFocused: HTMLElement | null = null

function close() {
  if (!props.busy) emit('close')
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !panelRef.value) return

  const focusable = Array.from(
    panelRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  )
  const first = focusable[0]
  const last = focusable.at(-1)
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!import.meta.client) return
    if (open) {
      previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      panelRef.value?.querySelector<HTMLElement>('button:not([disabled])')?.focus()
    } else {
      previouslyFocused?.focus()
    }
  },
)

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-backdrop" @click.self="close">
        <section
          ref="panelRef"
          class="modal-panel"
          :class="`modal-panel--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title || $slots.header ? titleId : undefined"
          :aria-describedby="description ? descriptionId : undefined"
        >
          <div class="modal-header">
            <div :id="titleId" class="modal-heading">
              <slot name="header">
                <h2 class="dialog-title">{{ title }}</h2>
              </slot>
            </div>
            <IconButton
              :label="closeLabel || t('common.close')"
              :icon="X"
              variant="secondary"
              size="control"
              :disabled="busy"
              @click="close"
            />
          </div>

          <div class="modal-body">
            <p v-if="description" :id="descriptionId" class="t-small modal-description">{{ description }}</p>
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
.dialog-title {
  font-size: 1.125rem;
  font-weight: 650;
  line-height: 1.4;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background: var(--scrim);
  backdrop-filter: blur(var(--blur-sm));
}

.modal-panel {
  display: flex;
  width: 100%;
  max-height: min(84dvh, 760px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--glass-inset), var(--shadow);
  backdrop-filter: var(--glass-filter);
}

.modal-panel--sm {
  max-width: 420px;
}

.modal-panel--md {
  max-width: 560px;
}

.modal-panel--lg {
  max-width: 720px;
}

.modal-header {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-5) var(--space-3);
}

.modal-heading {
  min-width: 0;
  padding-top: 6px;
}

.modal-body {
  min-width: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 var(--space-5) var(--space-5);
}

.modal-description {
  color: var(--text-muted);
}

.modal-actions {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5) var(--space-5);
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
  transform: translateY(10px) scale(0.98);
}

@media (max-width: 640px) {
  .modal-backdrop {
    align-items: end;
    padding: var(--space-3);
    padding-bottom: max(var(--space-3), env(safe-area-inset-bottom));
  }

  .modal-panel {
    max-height: min(86dvh, 720px);
    border-radius: var(--radius-lg);
  }

  .modal-header {
    padding: var(--space-4) var(--space-4) var(--space-3);
  }

  .modal-body {
    padding: 0 var(--space-4) var(--space-4);
  }

  .modal-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: var(--space-3) var(--space-4) var(--space-4);
  }
}
</style>
