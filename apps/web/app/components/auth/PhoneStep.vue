<script setup lang="ts">
import Button from '../ui/Button.vue'
import PopoverMenu from '../ui/PopoverMenu.vue'
import { ChevronDown } from '../../lib/icons'

const phone = defineModel<string>('phone', { required: true })
defineProps<{ loading: boolean }>()
const emit = defineEmits<{ submit: [] }>()

const { t } = useI18n()
const phoneInput = usePhoneInput()
const phoneDisplay = phoneInput.displayValue
const countryOpen = ref(false)
const phoneInputId = useId()

const selectedCountryLabel = computed(() => {
  const country = phoneInput.country.value
  return country.dialCode
})

const phonePlaceholder = computed(() => {
  const [firstGroup = 0, ...rest] = phoneInput.country.value.pattern
  const prefix =
    firstGroup > 0 ? `(${Array.from({ length: firstGroup }, (_, index) => String((index + 1) % 10)).join('')})` : ''
  const suffix = rest
    .map((size) => Array.from({ length: size }, (_, index) => String((index + 1) % 10)).join(''))
    .join(' ')

  return [prefix, suffix].filter(Boolean).join(' ')
})

const phoneMaxLength = computed(() => phoneInput.maxDisplayLength.value)

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value
  phoneInput.displayValue.value = value
  // Force update the input value to the formatted one
  target.value = phoneInput.displayValue.value
}

// Sync with parent phone model
watch(
  phoneInput.normalizedPhone,
  (val) => {
    phone.value = val
  },
  { immediate: true },
)

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
    <div class="auth-field">
      <label class="t-label" :for="phoneInputId">{{ t('login.phoneLabel') }}</label>
      <div class="phone-row">
        <PopoverMenu
          v-model:open="countryOpen"
          align="start"
          match-trigger-width
          :aria-label="t('login.selectCountry')"
          panel-role="dialog"
        >
          <template #trigger>
            <button
              class="dial-code"
              type="button"
              :aria-label="t('login.countryLabel')"
              :aria-expanded="countryOpen"
              @click.stop="countryOpen = !countryOpen"
            >
              <ChevronDown class="chevron" :size="14" aria-hidden="true" />
              <span>{{ phoneInput.country.value.code }} {{ selectedCountryLabel }}</span>
            </button>
          </template>

          <div class="country-options" role="listbox" :aria-label="t('login.selectCountry')">
            <button
              v-for="country in phoneInput.countries"
              :key="country.code"
              type="button"
              role="option"
              class="country-option"
              :class="{ active: country.code === phoneInput.countryCode.value }"
              :aria-selected="country.code === phoneInput.countryCode.value"
              @click="selectCountry(country.code)"
            >
              <span class="country-flag" aria-hidden="true">{{ country.flag }}</span>
              <span class="country-code">{{ country.code }}</span>
              <span class="t-mono">{{ country.dialCode }}</span>
            </button>
          </div>
        </PopoverMenu>

        <input
          :id="phoneInputId"
          :value="phoneDisplay"
          class="input phone-input"
          :placeholder="phonePlaceholder"
          :maxlength="phoneMaxLength"
          inputmode="tel"
          autocomplete="tel"
          @input="handleInput"
        />
      </div>
    </div>

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
  gap: 0;
  min-height: 48px;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
}

.dial-code {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 48px;
  padding: 0 var(--space-3);
  border: 0;
  border-right: 1px solid var(--border-default);
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    color var(--transition-fast);
}

.dial-code:hover,
.dial-code[aria-expanded='true'] {
  background: var(--bg-overlay);
  color: var(--text-primary);
}

.phone-input {
  min-height: 48px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.phone-input:focus {
  box-shadow: none;
}

.chevron {
  flex: 0 0 auto;
  color: var(--text-tertiary);
  transition: transform var(--transition-normal);
}

.dial-code[aria-expanded='true'] .chevron {
  transform: rotate(180deg);
}

.dial-code:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.country-options {
  display: grid;
  width: 100%;
  gap: var(--space-1);
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
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.country-option:hover,
.country-option.active {
  background: var(--accent-subtle);
  color: var(--accent);
}

.country-flag {
  display: inline-grid;
  width: 22px;
  height: 18px;
  flex: 0 0 auto;
  place-items: center;
  font-size: 16px;
  line-height: 1;
}

.country-code {
  display: none;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
}

@media (max-width: 420px) {
  .phone-row {
    grid-template-columns: minmax(96px, auto) minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
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
