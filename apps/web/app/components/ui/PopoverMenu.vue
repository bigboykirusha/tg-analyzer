<script setup lang="ts">
import MenuItem from './MenuItem.vue'
import ModalDialog from './ModalDialog.vue'
export interface PopoverMenuOption {
  label: string
  value: string
  disabled?: boolean
}

const props = defineProps<{
  open: boolean
  options?: PopoverMenuOption[]
  align?: 'start' | 'end'
  matchTriggerWidth?: boolean
  ariaLabel?: string
  panelRole?: 'menu' | 'dialog'
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [option: PopoverMenuOption]
}>()

const menuRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const isMobile = ref(false)
const { t } = useI18n()
let media: MediaQueryList | undefined
function syncViewport() {
  isMobile.value = media?.matches ?? false
  if (isMobile.value) {
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  }
}
let previouslyFocused: HTMLElement | null = null

function selectOption(option: PopoverMenuOption) {
  if (option.disabled) {
    return
  }
  emit('select', option)
  emit('update:open', false)
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (isMobile.value) return
  const menu = menuRef.value
  if (menu && !event.composedPath().includes(menu)) {
    emit('update:open', false)
  }
}

function closeMenu() {
  emit('update:open', false)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu()
    return
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !panelRef.value) return
  const items = Array.from(
    panelRef.value.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"]), button:not([disabled]), [href], input:not([disabled])',
    ),
  )
  if (!items.length) return
  event.preventDefault()
  const current = Math.max(0, items.indexOf(document.activeElement as HTMLElement))
  const nextIndex =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
  items[nextIndex]?.focus()
}

watch(
  () => props.open,
  async (open) => {
    if (!import.meta.client || isMobile.value) return
    if (open) {
      previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      document.addEventListener('pointerdown', handleDocumentPointerDown, true)
      panelRef.value
        ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"]), button:not([disabled])')
        ?.focus()
      return
    }
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
    if (panelRef.value?.contains(document.activeElement)) previouslyFocused?.focus()
  },
)

onMounted(() => {
  media = window.matchMedia('(max-width: 768px)')
  syncViewport()
  media.addEventListener('change', syncViewport)
})

onBeforeUnmount(() => {
  media?.removeEventListener('change', syncViewport)
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
})
</script>

<template>
  <div ref="menuRef" class="popover-root" @click.stop>
    <slot name="trigger" />
    <Transition name="popover">
      <div
        v-if="open && !isMobile"
        class="popover-layer"
        :class="[align === 'start' ? 'align-start' : 'align-end', { 'match-trigger': matchTriggerWidth }]"
        @click.self="closeMenu"
      >
        <div
          ref="panelRef"
          class="popover-panel"
          :role="panelRole ?? 'menu'"
          :aria-label="ariaLabel"
          @keydown="handleKeydown"
        >
          <slot>
            <MenuItem
              v-for="option in options ?? []"
              :key="option.value"
              type="button"
              role="menuitem"
              :disabled="option.disabled"
              :aria-disabled="option.disabled || undefined"
              @click="selectOption(option)"
            >
              {{ option.label }}
            </MenuItem>
          </slot>
        </div>
      </div>
    </Transition>
    <ModalDialog
      v-if="isMobile"
      :open="open"
      :title="ariaLabel"
      :close-label="t('common.close')"
      size="sm"
      @close="closeMenu"
    >
      <div
        ref="panelRef"
        :role="panelRole === 'dialog' ? undefined : 'menu'"
        :aria-label="ariaLabel"
        @keydown="handleKeydown"
      >
        <slot>
          <MenuItem
            v-for="option in options ?? []"
            :key="option.value"
            role="menuitem"
            :disabled="option.disabled"
            @click="selectOption(option)"
          >
            {{ option.label }}
          </MenuItem>
        </slot>
      </div>
    </ModalDialog>
  </div>
</template>

<style scoped>
.popover-root {
  position: relative;
  min-width: 0;
  width: auto;
  max-width: 100%;
}

.popover-layer {
  position: absolute;
  top: calc(100% + var(--space-2));
  z-index: 30;
}

.popover-panel {
  display: grid;
  min-width: 180px;
  max-height: min(320px, 70vh);
  overflow-y: auto;
  gap: var(--space-1);
  padding: var(--space-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--glass-inset), var(--shadow);
  backdrop-filter: var(--glass-filter);
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

.popover-enter-active,
.popover-leave-active {
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.popover-enter-active .popover-panel,
.popover-leave-active .popover-panel {
  transition: transform var(--transition-normal);
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
  transform-origin: top;
}
</style>
