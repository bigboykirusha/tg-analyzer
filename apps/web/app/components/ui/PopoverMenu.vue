<script setup lang="ts">
import BottomSheet from './BottomSheet.vue'
import MenuItem from './MenuItem.vue'

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
  /** Sheet title on phones; defaults to `ariaLabel`. */
  title?: string
  panelRole?: 'menu' | 'dialog'
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [option: PopoverMenuOption]
}>()

const ITEMS = '[role="menuitem"]:not([disabled]), button:not([disabled]), [href], input:not([disabled])'

const menuRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
// Phones get a bottom sheet instead of the floating panel.
const isMobile = useMediaQuery('(max-width: 640px)')
let previouslyFocused: HTMLElement | null = null

function selectOption(option: PopoverMenuOption) {
  if (option.disabled) return
  emit('select', option)
  emit('update:open', false)
}

function closeMenu() {
  emit('update:open', false)
}

function handleDocumentPointerDown(event: PointerEvent) {
  const menu = menuRef.value
  if (menu && !event.composedPath().includes(menu)) closeMenu()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu()
    return
  }
  const root = (event.currentTarget as HTMLElement | null) ?? panelRef.value
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !root) return
  const items = Array.from(root.querySelectorAll<HTMLElement>(ITEMS))
  if (!items.length) return
  event.preventDefault()
  const current = items.indexOf(document.activeElement as HTMLElement)
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
      panelRef.value?.querySelector<HTMLElement>(ITEMS)?.focus()
      return
    }
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
    const active = document.activeElement
    if (!active || active === document.body || panelRef.value?.contains(active)) {
      previouslyFocused?.focus()
    }
  },
)

onBeforeUnmount(() => {
  if (import.meta.client) document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
})
</script>

<template>
  <div ref="menuRef" class="popover-root" @click.stop>
    <slot name="trigger" />
    <Transition name="popover">
      <div
        v-if="open && !isMobile"
        ref="panelRef"
        class="popover-panel"
        :class="[align === 'start' ? 'align-start' : 'align-end', { 'match-trigger': matchTriggerWidth }]"
        :role="panelRole ?? 'menu'"
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
    </Transition>
    <BottomSheet v-if="isMobile" :open="open" :title="title ?? ariaLabel" @close="closeMenu">
      <div
        class="popover-sheet"
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
    </BottomSheet>
  </div>
</template>

<style scoped>
.popover-root {
  position: relative;
  min-width: 0;
  max-width: 100%;
}

.popover-panel {
  position: absolute;
  z-index: var(--z-popover);
  top: calc(100% + var(--space-2));
  display: grid;
  gap: 2px;
  min-width: 232px;
  max-height: 360px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px;
  border: 0;
  border-radius: var(--radius-menu);
  background: var(--surface-raised);
  box-shadow: var(--shadow-overlay);
  scrollbar-width: thin;
}

.match-trigger {
  width: 100%;
}

.align-end {
  right: 0;
  transform-origin: top right;
}

.align-start {
  left: 0;
  transform-origin: top left;
}

.popover-sheet {
  display: grid;
  gap: var(--space-1);
}

.popover-enter-active,
.popover-leave-active {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
</style>
