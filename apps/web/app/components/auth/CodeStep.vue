<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import Button from '../ui/Button.vue'

const code = defineModel<string>('code', { required: true })
defineProps<{ loading: boolean }>()
const emit = defineEmits<{ submit: [] }>()

const { t } = useI18n()
const digits = ref(['', '', '', '', ''])
const inputs = ref<HTMLInputElement[]>([])

watch(code, (value) => {
  const next = value.replace(/\D/g, '').slice(0, 5).split('')
  digits.value = Array.from({ length: 5 }, (_, index) => next[index] ?? '')
}, { immediate: true })

watch(digits, (value) => {
  code.value = value.join('')
}, { deep: true })

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

  const chars = value.slice(0, 5 - index).split('')
  chars.forEach((char, offset) => {
    digits.value[index + offset] = char
  })
  focusInput(Math.min(index + chars.length, 4))
}

function handleKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    digits.value[index - 1] = ''
    focusInput(index - 1)
  }
  if (event.key === 'ArrowLeft' && index > 0) {
    focusInput(index - 1)
  }
  if (event.key === 'ArrowRight' && index < 4) {
    focusInput(index + 1)
  }
}

function handlePaste(event: ClipboardEvent) {
  const value = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, 5)
  if (!value) {
    return
  }
  event.preventDefault()
  digits.value = Array.from({ length: 5 }, (_, index) => value[index] ?? '')
  focusInput(Math.min(value.length, 5) - 1)
}

function submit() {
  if (code.value.length !== 5) {
    focusInput(Math.max(0, digits.value.findIndex((digit) => !digit)))
    return
  }
  emit('submit')
}

onMounted(() => {
  requestAnimationFrame(() => {
    focusInput(Math.max(0, digits.value.findIndex((digit) => !digit)))
  })
})
</script>

<template>
  <form class="auth-form" @submit.prevent="submit">
    <label class="auth-field">
      <span class="text-label">{{ t('login.codeLabel') }}</span>
      <div class="otp-row" @paste="handlePaste">
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
        >
      </div>
      <span class="text-caption">{{ t('login.codeHelp') }}</span>
    </label>
    <Button variant="primary" size="lg" :loading="loading" :disabled="code.length !== 5" block>
      {{ loading ? t('login.checkingCode') : t('login.confirmCode') }}
    </Button>
  </form>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.otp-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-2);
}

.otp-input {
  width: 100%;
  height: 52px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 20px;
  text-align: center;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
}

.otp-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-muted);
}

.otp-input:hover {
  background: var(--bg-elevated);
}
</style>
