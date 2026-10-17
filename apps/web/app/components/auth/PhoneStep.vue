<script setup lang="ts">
import Button from '../ui/Button.vue'
import Select, { type SelectOption } from '../ui/Select.vue'

const phone = defineModel<string>('phone', { required: true })
defineProps<{ loading: boolean }>()
const emit = defineEmits<{ submit: [] }>()

const { t, locale } = useI18n()
const phoneInput = usePhoneInput()
const phoneDisplay = phoneInput.displayValue
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

const countryOptions = computed<SelectOption[]>(() =>
  phoneInput.countries.map((country) => ({
    value: country.code,
    label: getCountryName(country.code),
    meta: country.dialCode,
    short: country.dialCode,
    flag: country.code,
  })),
)

function selectCountry(code: string) {
  phoneInput.setCountry(code)
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
    <div class="field">
      <label class="field__label" :for="phoneInputId">{{ t('login.phoneLabel') }}</label>
      <div class="input input--lg input--addon phone-field">
        <Select
          :model-value="phoneInput.countryCode.value"
          :options="countryOptions"
          variant="addon"
          trigger-class="dial-code"
          :aria-label="t('login.countryLabel')"
          :searchable="false"
          @update:model-value="selectCountry"
        />
        <input
          :id="phoneInputId"
          :value="phoneDisplay"
          class="input__control phone-input"
          :placeholder="phonePlaceholder"
          :maxlength="phoneMaxLength"
          inputmode="tel"
          autocomplete="tel"
          @input="handleInput"
        />
      </div>
    </div>

    <Button
      type="submit"
      variant="primary"
      size="lg"
      :loading="loading"
      :disabled="loading || !phoneInput.isValid.value"
      block
    >
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

.phone-input {
  font-variant-numeric: tabular-nums;
}
</style>
