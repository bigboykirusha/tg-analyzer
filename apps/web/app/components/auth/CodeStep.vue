<script setup lang="ts">
import Button from '../ui/Button.vue'
import Field from '../ui/Field.vue'
import OtpInput from '../ui/OtpInput.vue'
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
const size = computed(() => Math.min(Math.max(props.length, 3), 10))
const otpRef = ref<InstanceType<typeof OtpInput> | null>(null)

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
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
    <Field :label="t('login.codeLabel')" :hint="t('login.codeHelp')" group>
      <OtpInput ref="otpRef" v-model="code" :length="size" />
    </Field>
    <div class="code-actions t-small">
      <Button
        variant="link"
        class="code-actions__resend"
        :disabled="resendSeconds > 0 || loading"
        @click="emit('resend')"
      >
        {{
          resendSeconds > 0
            ? t('login.resendIn', { time: formatCountdown(resendSeconds) })
            : resendLabel || t('login.resend')
        }}
      </Button>
      <Button variant="link" :disabled="loading" @click="emit('changeNumber')">
        {{ t('login.changeNumber') }}
      </Button>
    </div>
    <Button type="submit" variant="primary" size="lg" :loading="loading" :disabled="code.length !== size" block>
      {{ loading ? t('login.checkingCode') : t('login.confirmCode') }}
    </Button>
    <p class="note code-trust">
      <Lock aria-hidden="true" />
      <span>{{ t('login.codeTrust') }}</span>
    </p>
  </form>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Under the cells: resend on the left, «change number» on the right, both quiet text buttons. */
.code-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
  margin-top: calc(var(--space-2) * -1);
}

/* While the countdown runs the resend link is muted; ready, it is ink like its neighbour. */
.code-actions__resend:not(:disabled) {
  color: var(--text);
}
</style>
