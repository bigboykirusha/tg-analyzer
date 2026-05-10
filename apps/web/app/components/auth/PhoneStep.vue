<script setup lang="ts">
import Button from '../ui/Button.vue'

const phone = defineModel<string>('phone', { required: true })
defineProps<{ loading: boolean }>()
const emit = defineEmits<{ submit: [] }>()

const { t } = useI18n()
const phoneInput = usePhoneInput()
const phoneDisplay = phoneInput.displayValue
const touched = ref(false)
const countryOpen = ref(false)
const countryMenuRef = ref<HTMLElement | null>(null)

const selectedCountryLabel = computed(() => {
  const country = phoneInput.country.value
  return `${country.flag} ${country.dialCode}`
})

watch(phoneInput.normalizedPhone, (value) => {
  phone.value = value
}, { immediate: true })

watch(phone, (value) => {
  if (value && value !== phoneInput.normalizedPhone.value) {
    phoneInput.setFromNormalized(value)
  }
})

function selectCountry(code: string) {
  phoneInput.setCountry(code)
  countryOpen.value = false
}

function submit() {
  touched.value = true
  if (!phoneInput.isValid.value) {
    return
  }
  emit('submit')
}

function handleDocumentClick(event: MouseEvent) {
  if (!countryMenuRef.value?.contains(event.target as Node)) {
    countryOpen.value = false
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
  <form class="auth-form" @submit.prevent="submit">
    <label class="auth-field">
      <span class="text-label">{{ t('login.phoneLabel') }}</span>
      <div class="phone-row">
        <div ref="countryMenuRef" class="country-menu">
          <button
            class="dial-code mono-value"
            type="button"
            :aria-label="t('login.countryLabel')"
            :aria-expanded="countryOpen"
            @click.stop="countryOpen = !countryOpen"
          >
            <span>{{ selectedCountryLabel }}</span>
            <span class="chevron" aria-hidden="true">⌄</span>
          </button>

          <div v-if="countryOpen" class="country-popover animate-scale-in">
            <button
              v-for="country in phoneInput.countries"
              :key="country.code"
              type="button"
              class="country-option"
              :class="{ active: country.code === phoneInput.countryCode.value }"
              @click="selectCountry(country.code)"
            >
              <span class="country-flag">{{ country.flag }}</span>
              <span class="mono-value">{{ country.dialCode }}</span>
            </button>
          </div>
        </div>

        <input
          v-model="phoneDisplay"
          class="input phone-input"
          :class="{ 'input-invalid': touched && !phoneInput.isValid.value }"
          :placeholder="t('login.phonePlaceholder')"
          inputmode="tel"
          autocomplete="tel"
          @blur="touched = true"
        >
      </div>
      <span v-if="touched && !phoneInput.isValid.value" class="field-error text-caption">
        {{ t('login.invalidPhone') }}
      </span>
    </label>

    <Button variant="primary" size="lg" :loading="loading" :disabled="!phoneInput.isValid.value" block>
      {{ loading ? t('login.sendingCode') : t('login.getCode') }}
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

.phone-row {
  display: grid;
  grid-template-columns: minmax(104px, auto) minmax(0, 1fr);
  align-items: center;
  gap: var(--space-2);
}

.country-menu {
  position: relative;
  min-width: 0;
}

.dial-code {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 44px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}

.dial-code:hover,
.dial-code[aria-expanded='true'] {
  border-color: var(--border-strong);
  background: var(--bg-overlay);
  color: var(--text-primary);
}

.chevron {
  color: var(--text-tertiary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1;
}

.country-popover {
  position: absolute;
  left: 0;
  top: calc(100% + var(--space-2));
  z-index: 20;
  display: grid;
  width: 168px;
  max-height: 248px;
  overflow-y: auto;
  padding: var(--space-1);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-lg);
}

.country-option {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2);
  min-height: 34px;
  padding: 0 var(--space-2);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.country-option:hover,
.country-option.active {
  background: var(--accent-muted);
  color: var(--accent);
}

.country-flag {
  font-family: var(--font-sans);
}

.country-code {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 11px;
}

.phone-input {
  font-family: var(--font-mono);
}

.input-invalid {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px var(--color-danger-muted);
}

.field-error {
  color: var(--color-danger);
}

@media (max-width: 420px) {
  .phone-row {
    grid-template-columns: minmax(96px, auto) minmax(0, 1fr);
  }

  .country-popover {
    width: 156px;
  }
}
</style>
