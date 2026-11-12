<script setup lang="ts">
import Button from '../ui/Button.vue'
import Field from '../ui/Field.vue'
import OtpInput from '../ui/OtpInput.vue'

const code = defineModel<string>('code', { required: true })
const props = withDefaults(
  defineProps<{
    loading: boolean
    resendSeconds: number
    /** Digits in the code; email codes are longer than the usual five. */
    length?: number
    resendLabel?: string
    error?: string
  }>(),
  { length: 5, resendLabel: '', error: '' },
)
const emit = defineEmits<{ submit: []; resend: [] }>()

const { t } = useI18n()
const size = computed(() => Math.min(Math.max(props.length, 3), 10))
const otpRef = ref<InstanceType<typeof OtpInput> | null>(null)

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// The cells take focus as soon as the step shows, so a typed or pasted code is never lost.
onMounted(() => nextTick(() => otpRef.value?.focus()))

// A wrong code: empty the cells and put the caret back in the first one.
watch(
  () => props.error,
  (value) => {
    if (!value) return
    code.value = ''
    nextTick(() => otpRef.value?.focus())
  },
)

/** The last digit sends the code; the «Sign in» button stays for keyboards and screen readers. */
function complete() {
  if (!props.loading) emit('submit')
}

function submit() {
  if (code.value.length !== size.value) {
    otpRef.value?.focus()
    return
  }
  emit('submit')
}
</script>

<template>
  <form class="auth-form" @submit.prevent="submit">
    <Field :label="t('login.codeLabel')" :error="error || null" group hide-label>
      <OtpInput ref="otpRef" v-model="code" :length="size" @complete="complete" />
    </Field>
    <Button variant="link" class="resend" :disabled="resendSeconds > 0 || loading" @click="emit('resend')">
      {{
        resendSeconds > 0
          ? t('login.resendIn', { time: formatCountdown(resendSeconds) })
          : resendLabel || t('login.resend')
      }}
    </Button>
    <Button type="submit" variant="primary" size="lg" :loading="loading" :disabled="code.length !== size" block>
      {{ t('login.signIn') }}
    </Button>
  </form>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Under the cells: a quiet line while the countdown runs, a link once a new code can be sent. */
.resend {
  align-self: flex-start;
  margin-top: calc(var(--space-3) * -1);
  font: var(--text-label);
}

.resend:disabled {
  color: var(--text-muted);
  text-decoration: none;
  opacity: 1;
}
</style>
