<script setup lang="ts">
import Button from '../ui/Button.vue'
import PopoverMenu from '../ui/PopoverMenu.vue'

const phone = defineModel<string>('phone', { required: true })
defineProps<{ loading: boolean }>()
const emit = defineEmits<{ submit: [] }>()

const { t } = useI18n()
const phoneInput = usePhoneInput()
const phoneDisplay = phoneInput.displayValue
const countryOpen = ref(false)

const selectedCountryLabel = computed(() => {
  const country = phoneInput.country.value
  return country.dialCode
})

const phonePlaceholder = computed(() => {
  const [firstGroup = 0, ...rest] = phoneInput.country.value.pattern
  const prefix = firstGroup > 0 ? `(${Array.from({ length: firstGroup }, (_, index) => String((index + 1) % 10)).join('')})` : ''
  const suffix = rest
    .map((size) => Array.from({ length: size }, (_, index) => String((index + 1) % 10)).join(''))
    .join(' ')

  return [prefix, suffix].filter(Boolean).join(' ')
})

function flagSrc(code: string) {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`
}

function flagSrcset(code: string) {
  const normalized = code.toLowerCase()
  return `https://flagcdn.com/w40/${normalized}.png 1x, https://flagcdn.com/w80/${normalized}.png 2x`
}

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
  if (!phoneInput.isValid.value) {
    return
  }
  emit('submit')
}
</script>

<template>
  <form class="auth-form" @submit.prevent="submit">
    <label class="auth-field">
      <span class="text-label">{{ t('login.phoneLabel') }}</span>
      <div class="phone-row">
        <PopoverMenu v-model:open="countryOpen" align="start" match-trigger-width mobile-fullscreen>
          <template #trigger>
            <button
              class="dial-code mono-value"
              type="button"
              :aria-label="t('login.countryLabel')"
              :aria-expanded="countryOpen"
              @click="countryOpen = !countryOpen"
            >
              <img
                class="country-flag-img"
                :src="flagSrc(phoneInput.country.value.code)"
                :srcset="flagSrcset(phoneInput.country.value.code)"
                width="20"
                height="14"
                alt=""
                loading="eager"
              >
              <span>{{ selectedCountryLabel }}</span>
              <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>
          </template>

          <div class="country-sheet-head">
            <div>
              <span class="text-label">{{ t('login.countryLabel') }}</span>
              <h2 class="text-h3">{{ t('login.selectCountry') }}</h2>
            </div>
            <button class="country-sheet-close" type="button" :aria-label="t('common.close')" @click="countryOpen = false">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m7 7 10 10M17 7 7 17" />
              </svg>
            </button>
          </div>

          <div class="country-options">
            <button
              v-for="country in phoneInput.countries"
              :key="country.code"
              type="button"
              class="country-option"
              :class="{ active: country.code === phoneInput.countryCode.value }"
              @click="selectCountry(country.code)"
            >
              <img
                class="country-flag-img"
                :src="flagSrc(country.code)"
                :srcset="flagSrcset(country.code)"
                width="20"
                height="14"
                alt=""
                loading="lazy"
              >
              <span class="country-code">{{ country.code }}</span>
              <span class="mono-value">{{ country.dialCode }}</span>
            </button>
          </div>
        </PopoverMenu>

        <input
          v-model="phoneDisplay"
          class="input phone-input"
          :placeholder="phonePlaceholder"
          inputmode="tel"
          autocomplete="tel"
        >
      </div>
    </label>

    <Button variant="primary" size="lg" :loading="loading" :disabled="loading || !phoneInput.isValid.value" block>
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

:deep(.popover-root) {
  width: 100%;
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
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
  color: var(--text-tertiary);
}

.country-options {
  display: grid;
  width: 100%;
  gap: var(--space-1);
}

.country-sheet-head {
  display: none;
}

.country-option {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2);
  min-height: 38px;
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

.country-flag-img {
  width: 20px;
  height: 14px;
  flex: 0 0 auto;
  border-radius: 2px;
  object-fit: cover;
  box-shadow: 0 0 0 1px var(--border-subtle);
}

.country-code {
  display: none;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
}

.phone-input {
  font-family: var(--font-mono);
}

@media (max-width: 420px) {
  .phone-row {
    grid-template-columns: minmax(96px, auto) minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .country-sheet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
  }

  .country-sheet-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    color: var(--text-secondary);
  }

  .country-sheet-close svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-width: 1.8;
  }

  .country-options {
    flex: 1;
    overflow-y: auto;
    padding-top: var(--space-3);
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .country-options::-webkit-scrollbar {
    display: none;
  }

  .country-code {
    display: inline;
  }

  .country-option {
    min-height: 52px;
    padding: 0 var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
    border-radius: 0;
  }
}
</style>
