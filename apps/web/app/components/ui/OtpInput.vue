<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { fieldKey } from './Field.vue'

/**
 * A one-time code as a row of cells, one digit each. Typing moves on, Backspace on an empty cell
 * steps back, arrows move, and a pasted or autofilled code spreads over the cells. Inside UiField
 * (with `group`) the row is named by the field label. Every cell keeps the `.otp-input` class
 * (e2e tests type into it).
 */
const props = withDefaults(
  defineProps<{
    /** Number of digits, 3–10. */
    length?: number
    invalid?: boolean
    disabled?: boolean
    /** Accessible name of the row when it is not inside a UiField. */
    ariaLabel?: string
  }>(),
  { length: 5, invalid: false, disabled: false, ariaLabel: undefined },
)

const code = defineModel<string>({ required: true })
const emit = defineEmits<{ complete: [code: string] }>()

const { t } = useI18n()
const field = inject(fieldKey, null)
const size = computed(() => Math.min(Math.max(props.length, 3), 10))
const digits = ref<string[]>([])
const inputs = ref<HTMLInputElement[]>([])
const isInvalid = computed(() => props.invalid || Boolean(field?.invalid.value))

watch(
  [code, size],
  ([value]) => {
    const next = value.replace(/\D/g, '').slice(0, size.value).split('')
    digits.value = Array.from({ length: size.value }, (_, index) => next[index] ?? '')
  },
  { immediate: true },
)

function commit() {
  const value = digits.value.join('')
  code.value = value
  if (value.length === size.value) emit('complete', value)
}

function setInputRef(index: number) {
  return (element: Element | ComponentPublicInstance | null) => {
    if (element instanceof HTMLInputElement) inputs.value[index] = element
  }
}

function focusInput(index: number) {
  inputs.value[index]?.focus()
  inputs.value[index]?.select()
}

/** Focus the first empty cell (or the last one when the code is complete). */
function focusFirstEmpty() {
  const empty = digits.value.findIndex((digit) => !digit)
  focusInput(empty === -1 ? size.value - 1 : empty)
}

function handleInput(event: Event, index: number) {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '')
  if (!value) {
    digits.value[index] = ''
    input.value = ''
    commit()
    return
  }
  const chars = value.slice(0, size.value - index).split('')
  chars.forEach((char, offset) => {
    digits.value[index + offset] = char
  })
  // A cell holds one digit even when several were typed or autofilled into it.
  input.value = digits.value[index] ?? ''
  commit()
  focusInput(Math.min(index + chars.length, size.value - 1))
}

function handleKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    event.preventDefault()
    digits.value[index - 1] = ''
    commit()
    focusInput(index - 1)
  } else if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault()
    focusInput(index - 1)
  } else if (event.key === 'ArrowRight' && index < size.value - 1) {
    event.preventDefault()
    focusInput(index + 1)
  }
}

function handlePaste(event: ClipboardEvent) {
  const value = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, size.value)
  if (!value) return
  event.preventDefault()
  digits.value = Array.from({ length: size.value }, (_, index) => value[index] ?? '')
  commit()
  focusInput(Math.min(value.length, size.value) - 1)
}

defineExpose({ focus: focusFirstEmpty })
</script>

<template>
  <div
    class="otp"
    :class="{ 'otp--invalid': isInvalid }"
    role="group"
    :aria-labelledby="ariaLabel ? undefined : field?.labelId.value"
    :aria-label="ariaLabel"
    :aria-describedby="field?.describedby.value"
    :style="{ '--otp-count': size }"
    @paste="handlePaste"
  >
    <input
      v-for="(_, index) in digits"
      :id="index === 0 ? field?.id.value : undefined"
      :key="index"
      :ref="setInputRef(index)"
      :value="digits[index]"
      class="otp-input"
      type="text"
      name="one-time-code"
      inputmode="numeric"
      autocomplete="one-time-code"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      :maxlength="size"
      :disabled="disabled"
      :aria-invalid="isInvalid || undefined"
      :aria-label="t('common.otpDigit', { index: index + 1, count: size })"
      @input="handleInput($event, index)"
      @keydown="handleKeydown($event, index)"
      @focus="($event.target as HTMLInputElement).select()"
    />
  </div>
</template>

<style scoped>
.otp {
  display: grid;
  grid-template-columns: repeat(var(--otp-count), minmax(0, 1fr));
  gap: var(--space-2);
}

/* A cell is a 56 well with one digit in h2's size; 2 px ink on focus, 2 px red when the code is wrong. */
.otp-input {
  width: 100%;
  min-width: 0;
  height: var(--row-height);
  border-radius: var(--radius-well);
  background: var(--surface-2);
  box-shadow: var(--ring-hairline);
  color: var(--text);
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  caret-color: var(--text);
  text-align: center;
  outline: none;
  transition:
    background-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.otp-input:focus {
  background: var(--surface);
  box-shadow: var(--ring-field-focus);
}

.otp--invalid .otp-input {
  box-shadow: var(--ring-field-error);
}

.otp-input:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}
</style>
