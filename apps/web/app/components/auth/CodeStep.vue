<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import Button from '../ui/Button.vue'
import { Lock } from '../../lib/icons'

const code = defineModel<string>('code', { required: true })
const props = withDefaults(
  defineProps<{
    loading: boolean
    resendSeconds: number
    /** Digits in the code; email codes are longer than the usual five. */
    length?: number
    resendLabel?: string
  }>(),
  { length: 5, resendLabel: '' },
)
const emit = defineEmits<{ submit: []; resend: []; changeNumber: [] }>()

const { t } = useI18n()
const size = computed(() => Math.min(Math.max(props.length, 4), 8))
const digits = ref<string[]>(Array.from({ length: props.length }, () => ''))
const inputs = ref<HTMLInputElement[]>([])

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

watch(
  code,
  (value) => {
    const next = value.replace(/\D/g, '').slice(0, size.value).split('')
    digits.value = Array.from({ length: size.value }, (_, index) => next[index] ?? '')
  },
  { immediate: true },
)

watch(
  digits,
  (value) => {
    code.value = value.join('')
  },
  { deep: true },
)

function setInputRef(index: number) {
  return (element: Element | ComponentPublicInstance | null) => {
    if (element instanceof HTMLInputElement) {
      inputs.value[index] = element
    }
  }
}

function focusInput(index: number) {
  inputs.value[index]?.focus()
  inputs.value[index]?.select()
}

function handleInput(event: Event, index: number) {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '')
  if (!value) {
    digits.value[index] = ''
    return
  }

  const chars = value.slice(0, size.value - index).split('')
  chars.forEach((char, offset) => {
    digits.value[index + offset] = char
  })
  focusInput(Math.min(index + chars.length, size.value - 1))
}

function handleKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    digits.value[index - 1] = ''
    focusInput(index - 1)
  }
  if (event.key === 'ArrowLeft' && index > 0) {
    focusInput(index - 1)
  }
  if (event.key === 'ArrowRight' && index < size.value - 1) {
    focusInput(index + 1)
  }
}

function handlePaste(event: ClipboardEvent) {
  const value = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, size.value)
  if (!value) {
    return
  }
  event.preventDefault()
  digits.value = Array.from({ length: size.value }, (_, index) => value[index] ?? '')
  focusInput(Math.min(value.length, size.value) - 1)
}

function submit() {
  if (code.value.length !== size.value) {
    focusInput(
      Math.max(
        0,
        digits.value.findIndex((digit) => !digit),
      ),
    )
    return
  }
  emit('submit')
}
</script>

<template>
  <form class="auth-form" @submit.prevent="submit">
    <label class="field">
      <span class="field__label">{{ t('login.codeLabel') }}</span>
      <div class="otp-row" :style="{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }" @paste="handlePaste">
        <input
          v-for="(_, index) in digits"
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
          maxlength="1"
          :aria-label="t('login.codeLabel')"
          @input="handleInput($event, index)"
          @keydown="handleKeydown($event, index)"
        />
      </div>
      <span class="field__hint">{{ t('login.codeHelp') }}</span>
    </label>
    <div class="code-actions t-small">
      <button type="button" class="text-action" :disabled="resendSeconds > 0 || loading" @click="emit('resend')">
        {{
          resendSeconds > 0
            ? t('login.resendIn', { time: formatCountdown(resendSeconds) })
            : resendLabel || t('login.resend')
        }}
      </button>
      <button type="button" class="text-action text-action-primary" :disabled="loading" @click="emit('changeNumber')">
        {{ t('login.changeNumber') }}
      </button>
    </div>
    <Button variant="primary" size="lg" :loading="loading" :disabled="code.length !== size" block>
      {{ loading ? t('login.checkingCode') : t('login.confirmCode') }}
    </Button>
    <p class="code-trust">
      <Lock class="code-trust__icon" aria-hidden="true" />
      <span>{{ t('login.codeTrust') }}</span>
    </p>
  </form>
</template>

<style scoped>
/* The moment people hesitate most: say plainly what the code lets us do. */
.code-trust {
  display: flex;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

.code-trust__icon {
  flex: none;
  width: 16px;
  height: 16px;
  margin-top: 2px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.code-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.text-action {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.text-action:disabled {
  color: var(--text-muted);
  cursor: default;
}

.text-action-primary:not(:disabled) {
  color: var(--accent-ink);
}

.otp-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-2);
}

.otp-input {
  width: 100%;
  height: var(--control-lg);
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--surface-2);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  outline: none;
  transition:
    background-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

@media (hover: hover) {
  .otp-input:hover {
    background: var(--fill-hover);
  }
}

.otp-input:focus {
  background: var(--surface);
  box-shadow: var(--focus-ring-field);
}
</style>
