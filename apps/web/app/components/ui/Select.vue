<script setup lang="ts" generic="T extends string">
import type { Component } from 'vue'
import { Check, ChevronDown, Search } from '../../lib/icons'
import BottomSheet from './BottomSheet.vue'
import CountryFlag from './CountryFlag.vue'

export interface SelectOption<TValue extends string = string> {
  value: TValue
  label: string
  /** Muted text on the right, e.g. a dial code. */
  meta?: string
  /** Shorter text for the trigger (defaults to `label`). */
  short?: string
  icon?: Component
  /** ISO country code; renders a flag. */
  flag?: string
  group?: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: T | null
    options: SelectOption<T>[]
    /** Visible label above the field; also the sheet title. */
    label?: string
    /** Accessible name when there is no visible label. */
    ariaLabel?: string
    placeholder?: string
    size?: 'md' | 'lg'
    /** Search field on top; by default when there are more than 8 options. */
    searchable?: boolean
    searchPlaceholder?: string
    invalid?: boolean
    disabled?: boolean
    /** `addon` renders the compact trigger that sits inside an `.input` (country code). */
    variant?: 'field' | 'addon'
    triggerClass?: string
  }>(),
  {
    label: '',
    ariaLabel: '',
    placeholder: '',
    size: 'md',
    searchable: undefined,
    searchPlaceholder: '',
    invalid: false,
    disabled: false,
    variant: 'field',
    triggerClass: '',
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

const { t } = useI18n()
const id = useId()
const labelId = `${id}-label`
const listId = `${id}-list`
const optionId = (index: number) => `${id}-option-${index}`

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const open = ref(false)
const query = ref('')
const activeIndex = ref(-1)
const openUp = ref(false)
const isMobile = useMediaQuery('(max-width: 640px)')

const MAX_PANEL_HEIGHT = 320
const showSearch = computed(() => props.searchable ?? props.options.length > 8)
const selected = computed(() => props.options.find((option) => option.value === props.modelValue) ?? null)
const filtered = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  if (!needle) return props.options
  return props.options.filter((option) =>
    [option.label, option.meta, option.short].some((text) => text?.toLocaleLowerCase().includes(needle)),
  )
})
// Group headers only without a query: search results are one flat list.
const rows = computed(() =>
  filtered.value.map((option, index) => ({
    option,
    index,
    header:
      !query.value && option.group && option.group !== filtered.value[index - 1]?.group ? option.group : undefined,
  })),
)
const name = computed(() => props.label || props.ariaLabel)

function enabledIndex(from: number, step: 1 | -1) {
  const list = filtered.value
  for (let offset = 0; offset < list.length; offset += 1) {
    const index = (from + step * offset + list.length * 2) % list.length
    if (!list[index]?.disabled) return index
  }
  return -1
}

async function scrollActiveIntoView() {
  await nextTick()
  const el = document.getElementById(optionId(activeIndex.value))
  el?.scrollIntoView({ block: 'nearest' })
}

async function show() {
  if (props.disabled || open.value) return
  query.value = ''
  const current = filtered.value.findIndex((option) => option.value === props.modelValue)
  activeIndex.value = current >= 0 ? current : enabledIndex(0, 1)
  if (!isMobile.value && triggerRef.value) {
    const rect = triggerRef.value.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom
    openUp.value = below < MAX_PANEL_HEIGHT && rect.top > below
  }
  open.value = true
  await nextTick()
  if (showSearch.value) searchRef.value?.focus()
  else listRef.value?.focus()
  void scrollActiveIntoView()
}

function hide(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) triggerRef.value?.focus()
}

function choose(option: SelectOption<T> | undefined) {
  if (!option || option.disabled) return
  emit('update:modelValue', option.value)
  hide()
}

function move(step: 1 | -1) {
  activeIndex.value = enabledIndex(activeIndex.value + step, step)
  void scrollActiveIntoView()
}

/** Typing a letter jumps to the next option that starts with it. */
function typeahead(key: string) {
  const list = filtered.value
  const needle = key.toLocaleLowerCase()
  for (let offset = 1; offset <= list.length; offset += 1) {
    const index = (activeIndex.value + offset) % list.length
    if (!list[index]?.disabled && list[index]?.label.toLocaleLowerCase().startsWith(needle)) {
      activeIndex.value = index
      void scrollActiveIntoView()
      return
    }
  }
}

function onListKeydown(event: KeyboardEvent) {
  const inSearch = event.target === searchRef.value
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      move(-1)
      break
    case 'Home':
    case 'End':
      if (inSearch) return
      event.preventDefault()
      activeIndex.value = event.key === 'Home' ? enabledIndex(0, 1) : enabledIndex(filtered.value.length - 1, -1)
      void scrollActiveIntoView()
      break
    case 'Enter':
      event.preventDefault()
      choose(filtered.value[activeIndex.value])
      break
    case ' ':
      if (inSearch) return
      event.preventDefault()
      choose(filtered.value[activeIndex.value])
      break
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      hide()
      break
    case 'Tab':
      hide(false)
      break
    default:
      if (!inSearch && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        if (showSearch.value) {
          searchRef.value?.focus()
        } else {
          typeahead(event.key)
        }
      }
  }
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
    event.preventDefault()
    void show()
  } else if (event.key.length === 1 && /\S/.test(event.key) && !event.ctrlKey && !event.metaKey) {
    void show().then(() => {
      if (showSearch.value) query.value = event.key
      else typeahead(event.key)
    })
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (rootRef.value && !event.composedPath().includes(rootRef.value)) hide(false)
}

watch(query, () => {
  activeIndex.value = enabledIndex(0, 1)
})

watch(open, (value) => {
  if (!import.meta.client) return
  if (value && !isMobile.value) document.addEventListener('pointerdown', onDocumentPointerDown, true)
  else document.removeEventListener('pointerdown', onDocumentPointerDown, true)
})

onBeforeUnmount(() => {
  if (import.meta.client) document.removeEventListener('pointerdown', onDocumentPointerDown, true)
})

defineExpose({ focus: () => triggerRef.value?.focus() })
</script>

<template>
  <div ref="rootRef" class="select" :class="[`select--${variant}`, { 'is-open': open, 'select--invalid': invalid }]">
    <span v-if="label && variant === 'field'" :id="labelId" class="field__label select__label">{{ label }}</span>
    <button
      ref="triggerRef"
      type="button"
      :class="[variant === 'addon' ? 'select__addon' : ['select__trigger', `select__trigger--${size}`], triggerClass]"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="open ? listId : undefined"
      :aria-label="variant === 'addon' || !label ? ariaLabel || label : undefined"
      :aria-labelledby="variant === 'field' && label ? `${labelId} ${id}-value` : undefined"
      :aria-invalid="invalid || undefined"
      @click="open ? hide() : show()"
      @keydown="onTriggerKeydown"
    >
      <CountryFlag v-if="selected?.flag" class="select__flag" :code="selected.flag" />
      <component :is="selected.icon" v-else-if="selected?.icon" class="select__lead" aria-hidden="true" />
      <span :id="`${id}-value`" class="select__value" :class="{ 'is-placeholder': !selected }">
        {{ selected ? (variant === 'addon' ? (selected.short ?? selected.label) : selected.label) : placeholder }}
      </span>
      <span v-if="variant === 'field' && selected?.meta" class="select__meta">{{ selected.meta }}</span>
      <ChevronDown class="select__chevron" aria-hidden="true" />
    </button>

    <Transition name="select-pop">
      <div
        v-if="open && !isMobile"
        class="select__panel"
        :class="{ 'select__panel--up': openUp }"
        @keydown="onListKeydown"
      >
        <label v-if="showSearch" class="select__search">
          <Search aria-hidden="true" />
          <input
            ref="searchRef"
            v-model="query"
            type="text"
            :placeholder="searchPlaceholder || t('common.search')"
            :aria-label="searchPlaceholder || t('common.search')"
            :aria-controls="listId"
            :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
            autocomplete="off"
          />
        </label>
        <div
          :id="listId"
          ref="listRef"
          class="select__list"
          role="listbox"
          tabindex="-1"
          :aria-label="name"
          :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
        >
          <template v-for="row in rows" :key="row.option.value">
            <div v-if="row.header" class="select__group" role="presentation">{{ row.header }}</div>
            <div
              :id="optionId(row.index)"
              class="option"
              :class="{ 'is-active': row.index === activeIndex }"
              role="option"
              :aria-selected="row.option.value === modelValue"
              :aria-disabled="row.option.disabled || undefined"
              @pointermove="activeIndex = row.index"
              @click="choose(row.option)"
            >
              <CountryFlag v-if="row.option.flag" class="select__flag" :code="row.option.flag" />
              <component :is="row.option.icon" v-else-if="row.option.icon" class="option__icon" aria-hidden="true" />
              <span class="option__label">{{ row.option.label }}</span>
              <span v-if="row.option.meta" class="option__meta">{{ row.option.meta }}</span>
              <Check class="option__check" aria-hidden="true" />
            </div>
          </template>
          <p v-if="!rows.length" class="select__empty">{{ t('common.noResults') }}</p>
        </div>
      </div>
    </Transition>

    <BottomSheet v-if="isMobile" :open="open" :title="name" @close="hide()">
      <template v-if="showSearch" #search>
        <label class="select__search select__search--sheet" @keydown="onListKeydown">
          <Search aria-hidden="true" />
          <input
            ref="searchRef"
            v-model="query"
            type="text"
            :placeholder="searchPlaceholder || t('common.search')"
            :aria-label="searchPlaceholder || t('common.search')"
            :aria-controls="listId"
            autocomplete="off"
          />
        </label>
      </template>
      <div
        :id="listId"
        ref="listRef"
        class="select__list"
        role="listbox"
        tabindex="-1"
        :aria-label="name"
        :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
        @keydown="onListKeydown"
      >
        <template v-for="row in rows" :key="row.option.value">
          <div v-if="row.header" class="select__group" role="presentation">{{ row.header }}</div>
          <div
            :id="optionId(row.index)"
            class="option"
            :class="{ 'is-active': row.index === activeIndex }"
            role="option"
            :aria-selected="row.option.value === modelValue"
            :aria-disabled="row.option.disabled || undefined"
            @click="choose(row.option)"
          >
            <CountryFlag v-if="row.option.flag" class="select__flag" :code="row.option.flag" />
            <component :is="row.option.icon" v-else-if="row.option.icon" class="option__icon" aria-hidden="true" />
            <span class="option__label">{{ row.option.label }}</span>
            <span v-if="row.option.meta" class="option__meta">{{ row.option.meta }}</span>
            <Check class="option__check" aria-hidden="true" />
          </div>
        </template>
        <p v-if="!rows.length" class="select__empty">{{ t('common.noResults') }}</p>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.select {
  position: relative;
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

/* Inside an `.input` the panel anchors to the whole field. */
.select--addon {
  position: static;
  display: flex;
  align-self: stretch;
}

/* ─── Field trigger: same box and states as Input ──────────────────────── */
.select__trigger {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--control-md);
  padding: 0 var(--space-3) 0 var(--space-4);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 16px;
  line-height: 24px;
  text-align: left;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.select__trigger--lg {
  min-height: var(--control-lg);
}

@media (hover: hover) {
  .select__trigger:hover {
    border-color: var(--text-muted);
  }
}

.select__trigger:focus-visible,
.select__trigger[aria-expanded='true'] {
  outline: none;
  border-color: var(--accent);
  box-shadow: var(--focus-halo);
}

.select--invalid .select__trigger {
  border-color: var(--danger);
}

.select--invalid .select__trigger:focus-visible {
  box-shadow: var(--focus-halo-danger);
}

.select__trigger:disabled {
  border-color: var(--border);
  background: var(--surface-2);
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

.select__value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select__value.is-placeholder,
.select__meta,
.select__lead {
  color: var(--text-muted);
}

.select__chevron {
  color: var(--text-muted);
  transition: transform var(--transition-fast);
}

[aria-expanded='true'] > .select__chevron {
  transform: rotate(180deg);
}

/* ─── Add-on trigger (country code inside the phone field) ─────────────── */
.select__addon {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3) 0 var(--space-4);
  border: 0;
  border-right: 1px solid var(--border);
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 16px;
  white-space: nowrap;
}

.select__addon .select__value {
  flex: 0 0 auto;
}

@media (hover: hover) {
  .select__addon:hover {
    background: var(--hover);
  }
}

.select__addon:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--accent);
}

.select__flag {
  flex: 0 0 auto;
}

/* ─── Listbox panel ────────────────────────────────────────────────────── */
.select__panel {
  position: absolute;
  z-index: var(--z-popover);
  top: calc(100% + var(--space-2));
  right: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  min-width: 220px;
  max-height: 320px;
  overflow: hidden;
  padding: var(--space-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  box-shadow: var(--shadow-overlay);
}

.select__panel--up {
  top: auto;
  bottom: calc(100% + var(--space-2));
}

.select__list {
  display: grid;
  gap: var(--space-1);
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  outline: none;
  scrollbar-width: thin;
}

.select__search {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--control-sm);
  margin-bottom: var(--space-1);
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-muted);
}

.select__search input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font: var(--text-ui);
  font-weight: 400;
  outline: none;
}

.select__search input:focus-visible {
  box-shadow: none;
}

.select__search input::placeholder {
  color: var(--text-muted);
}

.select__search:focus-within {
  box-shadow: inset 0 0 0 2px var(--accent);
}

.select__group {
  padding: var(--space-2) var(--space-3) var(--space-1);
  color: var(--text-muted);
  font: var(--text-caption);
  font-weight: 600;
}

.select__empty {
  padding: var(--space-4) var(--space-3);
  color: var(--text-muted);
  font: var(--text-small);
  text-align: center;
}

.option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text);
  cursor: pointer;
  font: var(--text-ui);
  transition: background-color var(--transition-fast);
}

.option.is-active,
.option:hover {
  background: var(--hover);
}

.option:active {
  background: var(--pressed);
}

.option__icon,
.option__meta {
  color: var(--text-muted);
}

.option__label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option__meta {
  font: var(--text-small);
}

.option__check {
  color: var(--accent);
  visibility: hidden;
}

.option[aria-selected='true'] {
  font-weight: 600;
}

.option[aria-selected='true'] .option__check {
  visibility: visible;
}

.option[aria-disabled='true'] {
  background: transparent;
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

/* In a sheet the search is pinned above the list and 44px tall. */
.select__search--sheet {
  min-height: var(--control-md);
  margin-bottom: 0;
}

.select-pop-enter-active,
.select-pop-leave-active {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
}

.select-pop-enter-from,
.select-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

.select__panel--up.select-pop-enter-from,
.select__panel--up.select-pop-leave-to {
  transform: translateY(4px) scale(0.98);
}
</style>
