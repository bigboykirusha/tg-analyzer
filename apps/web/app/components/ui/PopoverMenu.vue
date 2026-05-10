<script setup lang="ts">
export interface PopoverMenuOption {
  label: string
  value: string
  disabled?: boolean
}

defineProps<{
  open: boolean
  options?: PopoverMenuOption[]
  align?: 'start' | 'end'
  matchTriggerWidth?: boolean
  mobileFullscreen?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [option: PopoverMenuOption]
}>()

const menuRef = ref<HTMLElement | null>(null)

function selectOption(option: PopoverMenuOption) {
  if (option.disabled) {
    return
  }
  emit('select', option)
  emit('update:open', false)
}

function handleDocumentClick(event: MouseEvent) {
  if (!menuRef.value?.contains(event.target as Node)) {
    emit('update:open', false)
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div ref="menuRef" class="popover-root" @click.stop>
    <slot name="trigger" />
    <Transition name="popover">
      <div
        v-if="open"
        class="popover-panel"
        :class="[
          align === 'start' ? 'align-start' : 'align-end',
          { 'match-trigger': matchTriggerWidth },
          { 'mobile-fullscreen': mobileFullscreen },
        ]"
      >
        <slot>
          <button
            v-for="option in options ?? []"
            :key="option.value"
            type="button"
            class="popover-option"
            :disabled="option.disabled"
            @click="selectOption(option)"
          >
            {{ option.label }}
          </button>
        </slot>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.popover-root {
  position: relative;
  min-width: 0;
  width: auto;
  max-width: 100%;
}

.popover-panel {
  position: absolute;
  top: calc(100% + var(--space-2));
  z-index: 30;
  display: grid;
  min-width: 180px;
  max-height: min(320px, 70vh);
  overflow-y: auto;
  gap: var(--space-1);
  padding: var(--space-1);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-lg);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.popover-panel::-webkit-scrollbar {
  display: none;
}

.match-trigger {
  width: 100%;
  min-width: 0;
}

.align-end {
  right: 0;
}

.align-start {
  left: 0;
}

.popover-option {
  display: flex;
  align-items: center;
  min-height: 38px;
  width: 100%;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.popover-option:hover {
  background: var(--bg-overlay);
}

.popover-option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.popover-enter-active,
.popover-leave-active {
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 640px) {
  .popover-panel {
    position: fixed;
    right: var(--space-3);
    left: var(--space-3);
    top: auto;
    bottom: var(--space-3);
    min-width: 0;
    max-height: 55vh;
  }

  .popover-panel.mobile-fullscreen {
    inset: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    width: auto;
    max-height: none;
    padding: var(--space-4);
    padding-top: max(var(--space-4), env(safe-area-inset-top));
    padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
    border: 0;
    border-radius: 0;
    background: var(--bg-base);
  }
}
</style>
