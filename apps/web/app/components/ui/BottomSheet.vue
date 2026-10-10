<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    closeLabel: string
  }>(),
  { title: '' },
)

const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

function close() {
  emit('close')
}

function trapFocus(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
    return
  }
  if (event.key !== 'Tab' || !panel.value) return
  const focusable = Array.from(
    panel.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  )
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!import.meta.client) return
    if (open) {
      previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.body.style.overflow = 'hidden'
      await nextTick()
      panel.value
        ?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ?.focus()
    } else {
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-backdrop" @click.self="close">
        <section
          ref="panel"
          class="sheet"
          role="dialog"
          aria-modal="true"
          :aria-label="title || closeLabel"
          @keydown="trapFocus"
        >
          <div class="sheet-handle" aria-hidden="true" />
          <header v-if="title" class="sheet-header">
            <h2 class="t-h3">{{ title }}</h2>
          </header>
          <div class="sheet-content"><slot /></div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: end;
  background: var(--scrim);
  backdrop-filter: blur(var(--blur-sm));
}
.sheet {
  width: 100%;
  max-height: min(80dvh, 640px);
  overflow: auto;
  overscroll-behavior: contain;
  padding: 10px max(var(--space-4), env(safe-area-inset-right))
    max(calc(var(--space-5) + env(safe-area-inset-bottom)), var(--space-5))
    max(var(--space-4), env(safe-area-inset-left));
  border: 1px solid var(--glass-border);
  border-bottom: 0;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  background: var(--glass-sheen), var(--surface-glass);
  box-shadow: var(--glass-inset), var(--shadow-lg);
  backdrop-filter: var(--glass-filter);
}
.sheet-handle {
  width: 36px;
  height: 5px;
  margin: 0 auto var(--space-4);
  border-radius: var(--radius-full);
  background: var(--border-strong);
}
.sheet-header {
  margin-bottom: var(--space-3);
}
.sheet-content {
  min-width: 0;
}
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity var(--transition-normal);
}
.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform var(--transition-slow);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>
