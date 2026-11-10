<script setup lang="ts" generic="T extends string">
import type { Component } from 'vue'
import { ChevronDown, Search } from '../../lib/icons'
import BottomSheet from './BottomSheet.vue'
import CountryFlag from './CountryFlag.vue'
import MenuPanel from './MenuPanel.vue'

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
    // The panel is at most --menu-max-height tall; open upwards when it would not fit below.
    const panelHeight =
      Number.parseFloat(getComputedStyle(triggerRef.value).getPropertyValue('--menu-max-height')) || 360
    openUp.value = below < panelHeight && rect.top > below
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
      :class="[variant === 'addon' ? 'select__addon' : 'select__trigger', triggerClass]"
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

    <Transition name="menu-panel">
      <MenuPanel
        v-if="open && !isMobile"
        class="select__panel"
        align="stretch"
        :side="openUp ? 'top' : 'bottom'"
        :scroll="false"
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
              :class="{ 'is-active': row.index === activeIndex, 'is-disabled': row.option.disabled }"
              role="option"
              :aria-selected="row.option.value === modelValue"
              :aria-disabled="row.option.disabled || undefined"
              @pointermove="activeIndex = row.index"
              @click="!row.option.disabled && choose(row.option)"
            >
              <CountryFlag v-if="row.option.flag" class="select__flag" :code="row.option.flag" />
              <component :is="row.option.icon" v-else-if="row.option.icon" class="option__icon" aria-hidden="true" />
              <span class="option__label">{{ row.option.label }}</span>
              <span v-if="row.option.meta" class="option__meta">{{ row.option.meta }}</span>
            </div>
          </template>
          <p v-if="!rows.length" class="select__empty">{{ t('common.noResults') }}</p>
        </div>
      </MenuPanel>
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
            :class="{ 'is-active': row.index === activeIndex, 'is-disabled': row.option.disabled }"
            role="option"
            :aria-selected="row.option.value === modelValue"
            :aria-disabled="row.option.disabled || undefined"
            @click="!row.option.disabled && choose(row.option)"
          >
            <CountryFlag v-if="row.option.flag" class="select__flag" :code="row.option.flag" />
            <component :is="row.option.icon" v-else-if="row.option.icon" class="option__icon" aria-hidden="true" />
            <span class="option__label">{{ row.option.label }}</span>
            <span v-if="row.option.meta" class="option__meta">{{ row.option.meta }}</span>
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
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.select--addon {
  flex: none;
}

.select__label {
  font: var(--text-label);
}

/* A field-shaped trigger: 44, grey well, hairline; ink ring while open or focused. */
.select__trigger {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  height: var(--control-md);
  padding: 0 var(--space-3) 0 var(--space-4);
  border-radius: var(--radius-well);
  background: var(--field-bg, var(--surface-2));
  box-shadow: var(--ring-hairline);
  font: var(--text-body);
  text-align: left;
  transition: box-shadow var(--transition-fast);
}

.select__trigger:focus-visible,
.select__trigger[aria-expanded='true'] {
  outline: none;
  background: var(--surface);
  box-shadow: var(--ring-field-focus);
}

.select--invalid .select__trigger {
  box-shadow: var(--ring-field-error);
}

.select__trigger:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

.select__value {
  flex: 1;
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
  flex: none;
  color: var(--text-muted);
  --icon-size: var(--icon-sm);
  transition: transform var(--transition-fast);
}

.is-open .select__chevron {
  transform: rotate(180deg);
}

/* The country code inside a phone field: a pill like every other control, inset 4 on every side. */
.select__addon {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: calc(var(--control-md) - var(--space-1) * 2);
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--btn-segment-on, var(--surface));
  font: var(--text-body);
}

.select__addon .select__value {
  flex: none;
}

@media (hover: hover) and (pointer: fine) {
  .select__addon:hover {
    background-image: linear-gradient(var(--hover), var(--hover));
  }
}

.select__flag {
  flex: none;
}

.select__list {
  display: flex;
  flex-direction: column;
  max-height: var(--menu-max-height);
  overflow-y: auto;
  overscroll-behavior: contain;
  outline: none;
}

.select__search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--control-sm);
  margin-bottom: var(--space-1);
  padding: 0 var(--space-3);
  border-radius: var(--radius-well);
  background: var(--fill-raised);
  color: var(--text-muted);
  font: var(--text-body);
  --icon-size: var(--icon-sm);
}

.select__search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  color: var(--text);
  outline: none;
}

.select__search input::placeholder {
  color: var(--text-muted);
}

.select__search:focus-within {
  box-shadow: var(--ring-field-focus);
}

.select__search--sheet {
  margin: 0;
}

.select__group {
  padding: var(--space-3) var(--space-3) var(--space-1);
  color: var(--text-muted);
  font: var(--text-caption);
}

.select__empty {
  padding: var(--space-3);
  color: var(--text-muted);
  font: var(--text-label);
}

/* An option is a menu row: 44, 12 corners; the chosen one sits on the selection fill. */
.option {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--control-md);
  padding: 0 var(--space-3);
  border-radius: var(--radius-well);
  font: var(--text-label);
  cursor: pointer;
}

.option.is-active {
  background: var(--hover);
}

.option[aria-selected='true'] {
  background: var(--sidebar-selection);
}

.option.is-disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

.option__icon {
  color: var(--text-muted);
}

.option__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option__meta {
  color: var(--text-muted);
  font: var(--text-label);
}
</style>
