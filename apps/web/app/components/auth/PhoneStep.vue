<script setup lang="ts">
import Button from '../ui/Button.vue'
import CountryFlag from '../ui/CountryFlag.vue'
import PopoverMenu from '../ui/PopoverMenu.vue'
import { ChevronDown } from '../../lib/icons'

const phone = defineModel<string>('phone', { required: true })
defineProps<{ loading: boolean }>()
const emit = defineEmits<{ submit: [] }>()

const { t, locale } = useI18n()
const phoneInput = usePhoneInput()
const phoneDisplay = phoneInput.displayValue
const countryOpen = ref(false)
const phoneInputId = useId()

const countryNames = computed(() => new Intl.DisplayNames([locale.value], { type: 'region' }))

function getCountryName(code: string) {
  return countryNames.value.of(code) ?? code
}

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
              <CountryFlag class="dial-flag" :code="phoneInput.country.value.code" />
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
              <CountryFlag :code="country.code" />
              <span class="country-name">{{ getCountryName(country.code) }}</span>
              <span class="country-dial">{{ country.dialCode }}</span>
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

:deep(.popover-layer) {
  width: min(288px, calc(100vw - 40px));
}

@media (min-width: 641px) {
  :deep(.popover-layer) {
    top: auto;
    bottom: calc(100% + var(--space-2));
  }
}

:deep(.popover-panel) {
  width: 100%;
  max-height: min(360px, 60vh);
  padding: var(--space-2);
  border-radius: var(--radius-lg);
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.phone-row {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  align-items: center;
  gap: 0;
  min-height: 48px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.phone-row:focus-within {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
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
  border-radius: calc(var(--radius-sm) - 1px) 0 0 calc(var(--radius-sm) - 1px);
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
  border-radius: 0 calc(var(--radius-sm) - 1px) calc(var(--radius-sm) - 1px) 0;
  background: transparent;
  box-shadow: none;
}

.phone-input:focus {
  outline: none;
  box-shadow: none;
}

.phone-input:focus-visible {
  outline: none;
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
}

.dial-flag {
  flex: 0 0 auto;
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
  gap: var(--space-3);
  min-height: 44px;
  padding: 0 var(--space-3);
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

.country-name {
  min-width: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.country-dial {
  color: var(--text-secondary);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.country-option.active .country-dial {
  color: var(--accent);
}

@media (max-width: 420px) {
  .phone-row {
    grid-template-columns: 76px minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .country-options {
    flex: 1;
    overflow-y: auto;
    padding-top: var(--space-2);
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .country-options::-webkit-scrollbar {
    display: none;
  }

  .country-option {
    min-height: 52px;
    padding: 0 var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
    border-radius: 0;
  }
}
</style>
