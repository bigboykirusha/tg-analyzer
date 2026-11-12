<script setup lang="ts">
import Button from '../ui/Button.vue'
import Field from '../ui/Field.vue'
import Input from '../ui/Input.vue'
import Select, { type SelectOption } from '../ui/Select.vue'

const phone = defineModel<string>('phone', { required: true })
defineProps<{ loading: boolean; error?: string }>()
const emit = defineEmits<{ submit: [] }>()

const { t, locale } = useI18n()
const phoneInput = usePhoneInput()
if (phone.value) phoneInput.setFromNormalized(phone.value)

// The browser knows where the person is; the server render starts with Russia.
onMounted(() => {
  if (phone.value && phoneInput.normalizedPhone.value.length > phoneInput.country.value.dialCode.length) return
  phoneInput.setCountry(detectPhoneCountry(navigator.languages ?? [], Intl.DateTimeFormat().resolvedOptions().timeZone))
})
const phoneDisplay = phoneInput.displayValue

const countryNames = computed(() => new Intl.DisplayNames([locale.value], { type: 'region' }))

function getCountryName(code: string) {
  return countryNames.value.of(code) ?? code
}

/** The country's grouping in zeros — «(000) 000 00 00»: a format, not a number that looks made up. */
const phonePlaceholder = computed(() => {
  const [firstGroup = 0, ...rest] = phoneInput.country.value.pattern
  const prefix = firstGroup > 0 ? `(${'0'.repeat(firstGroup)})` : ''
  const suffix = rest.map((size) => '0'.repeat(size)).join(' ')

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
    <Field :label="t('login.phoneLabel')" :error="error || null">
      <Input
        :model-value="phoneDisplay"
        addon
        class="phone-field"
        input-class="phone-input"
        :placeholder="phonePlaceholder"
        type="tel"
        name="phone"
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

    <Button type="submit" variant="primary" size="lg" :loading="loading" :disabled="!phoneInput.isValid.value" block>
      {{ loading ? t('login.sendingCode') : t('login.getCode') }}
    </Button>
    <p class="auth-trust">
      {{ t('login.trust') }}
      <NuxtLink to="/privacy" class="link">{{ t('login.trustLink') }}</NuxtLink>
    </p>
  </form>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.auth-trust {
  color: var(--text-muted);
  font: var(--text-label);
}
</style>
