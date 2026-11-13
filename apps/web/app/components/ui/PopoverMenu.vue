<script setup lang="ts">
import BottomSheet from './BottomSheet.vue'
import MenuItem from './MenuItem.vue'
import MenuPanel from './MenuPanel.vue'

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
const panelRef = ref<InstanceType<typeof MenuPanel> | null>(null)
const panelEl = computed(() => panelRef.value?.el ?? null)
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

/** Items that are on screen: menus may hide some rows per breakpoint. */
function visibleItems(root: HTMLElement | null | undefined) {
  return Array.from(root?.querySelectorAll<HTMLElement>(ITEMS) ?? []).filter((item) => item.offsetParent !== null)
}

/** Escape closes the menu wherever focus is, including the trigger that opened it. */
function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  closeMenu()
  previouslyFocused?.focus()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu()
    return
  }
  const root = (event.currentTarget as HTMLElement | null) ?? panelEl.value
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !root) return
  const items = visibleItems(root)
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
      document.addEventListener('keydown', handleDocumentKeydown)
      // The panel fades in, so the first item may only be focusable on the next frame.
      requestAnimationFrame(() => visibleItems(panelEl.value)[0]?.focus())
      return
    }
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
    document.removeEventListener('keydown', handleDocumentKeydown)
    const active = document.activeElement
    if (!active || active === document.body || panelEl.value?.contains(active)) {
      previouslyFocused?.focus()
    }
  },
)

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<template>
  <div ref="menuRef" class="popover-root" @click.stop>
    <slot name="trigger" />
    <Transition name="menu-panel">
      <MenuPanel
        v-if="open && !isMobile"
        ref="panelRef"
        class="popover-panel"
        :align="matchTriggerWidth ? 'stretch' : (align ?? 'end')"
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
      </MenuPanel>
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

.popover-sheet {
  display: flex;
  flex-direction: column;
}

/*
 * In a phone sheet a menu item is a list row, as UiGroup's rows in a sheet: 56 tall, running to the sheet's edges, the
 * text at the gutter, the hairline from the text to the edge — so a press fills the whole row, never a box that
 * starts where the words start.
 */
.popover-sheet {
  margin-inline: calc(-1 * var(--page-gutter));
}

.popover-sheet :deep(.menu-item) {
  min-height: var(--row-height);
  padding: 0 0 0 var(--page-gutter);
  border-radius: 0;
}

.popover-sheet :deep(.menu-item__body) {
  padding-right: var(--page-gutter);
  box-shadow: var(--divider-bottom);
}

.popover-sheet :deep(.menu-item:last-child .menu-item__body) {
  box-shadow: none;
}
</style>
