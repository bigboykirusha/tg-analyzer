<script setup lang="ts">
import Button from '../ui/Button.vue'
import Field from '../ui/Field.vue'
import Input from '../ui/Input.vue'
import Select, { type SelectOption } from '../ui/Select.vue'

const phone = defineModel<string>('phone', { required: true })
defineProps<{ loading: boolean }>()
const emit = defineEmits<{ submit: [] }>()

const { t, locale } = useI18n()
const phoneInput = usePhoneInput()
if (phone.value) phoneInput.setFromNormalized(phone.value)
const phoneDisplay = phoneInput.displayValue

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

/** A pasted or autofilled «+49…» picks the country; anything else is the national number. UiInput shows the formatted value. */
function handleInput(value: string) {
  if (value.trim().startsWith('+')) phoneInput.setFromNormalized(value)
  else phoneInput.displayValue.value = value
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
    <Field :label="t('login.phoneLabel')">
      <Input
        :model-value="phoneDisplay"
        size="lg"
        addon
        class="phone-field"
        input-class="phone-input"
        :placeholder="phonePlaceholder"
        inputmode="tel"
        autocomplete="tel"
        @update:model-value="handleInput"
      >
        <template #leading>
          <Select
            :model-value="phoneInput.countryCode.value"
            :options="countryOptions"
            variant="addon"
            trigger-class="dial-code"
            :aria-label="t('login.countryLabel')"
            :searchable="false"
            @update:model-value="selectCountry"
          />
        </template>
      </Input>
    </Field>

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
  gap: var(--space-6);
}
</style>
