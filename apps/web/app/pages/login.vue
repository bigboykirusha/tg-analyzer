<script setup lang="ts">
import type { CodeDeliveryDto, CodeDeliveryType } from '@tg-analyzer/shared'
import { ApiClientError } from '../composables/useApi'

definePageMeta({ middleware: ['guest'] })

const RESEND_DELAY_SECONDS = 60

const { sendCode, resendCode, verifyCode, verifyPassword } = useAuth()
const { t } = useI18n()
const errorMessage = useErrorMessage()

const step = ref<'phone' | 'code' | 'password'>('phone')
const phone = ref('')
const code = ref('')
const password = ref('')
const phoneCodeHash = ref('')
const delivery = ref<CodeDeliveryDto | null>(null)
const tempToken = ref('')
const passwordHint = ref<string | null>(null)
const loading = ref(false)
const error = ref('')
const resendAvailableAt = ref(0)
const now = useNow(1000)
const resendSeconds = computed(() => Math.max(0, Math.ceil((resendAvailableAt.value - now.value) / 1000)))

const route = useRoute()
/** Came back after Telegram ended the session: say so above the phone step, without a banner. */
const sessionEnded = computed(() => route.query.session === 'ended')
// Old links to the policy pointed here (#privacy); it is a page now.
onMounted(() => {
  if (route.hash === '#privacy') void navigateTo('/privacy', { replace: true })
})

useSeoMeta({ title: () => t('login.seoTitle'), description: () => t('seo.description'), robots: 'noindex' })

watch(step, () => {
  error.value = ''
})

async function run(action: () => Promise<void>) {
  loading.value = true
  error.value = ''
  try {
    await action()
  } catch (caught) {
    error.value = errorMessage(caught)
    // An expired login cannot be continued; start over from the phone step.
    if (caught instanceof ApiClientError && caught.code === 'LOGIN_SESSION_EXPIRED') {
      step.value = 'phone'
      error.value = errorMessage(caught)
    }
  } finally {
    loading.value = false
  }
}

function applyDelivery(result: { phoneCodeHash: string; delivery: CodeDeliveryDto }) {
  phoneCodeHash.value = result.phoneCodeHash
  delivery.value = result.delivery
  code.value = ''
  resendAvailableAt.value = Date.now() + (result.delivery.timeoutSec ?? RESEND_DELAY_SECONDS) * 1000
}

function requestCode() {
  return run(async () => {
    applyDelivery(await sendCode(phone.value))
    step.value = 'code'
  })
}

/** Next channel on the same attempt; a brand-new auth.sendCode is what Telegram throttles. */
function requestResend() {
  return run(async () => {
    applyDelivery(await resendCode({ phone: phone.value, phoneCodeHash: phoneCodeHash.value }))
  })
}

const DESCRIPTION: Record<CodeDeliveryType, string> = {
  app: 'login.delivery.app',
  sms: 'login.delivery.sms',
  call: 'login.delivery.call',
  missed_call: 'login.delivery.missedCall',
  email: 'login.delivery.email',
  email_setup_required: 'login.delivery.emailSetupRequired',
  unsupported: 'login.delivery.unsupported',
}
const RESEND_LABEL: Partial<Record<CodeDeliveryType, string>> = {
  sms: 'login.resendSms',
  call: 'login.resendCall',
  missed_call: 'login.resendCall',
}
const codeDescription = computed(() => {
  const value = delivery.value
  if (!value) return t('login.codeDescription')
  return t(DESCRIPTION[value.type] as 'login.delivery.app', { phone: phone.value, email: value.emailPattern ?? '' })
})
/** Telegram did not send a code this app can receive; the user has to act. */
const deliveryBlocked = computed(
  () => delivery.value?.type === 'email_setup_required' || delivery.value?.type === 'unsupported',
)
const resendLabel = computed(() => {
  const next = delivery.value?.nextType
  return next && RESEND_LABEL[next] ? t(RESEND_LABEL[next] as 'login.resendSms') : ''
})

function submitCode() {
  return run(async () => {
    const result = await verifyCode({ phone: phone.value, code: code.value, phoneCodeHash: phoneCodeHash.value })
    if ('passwordRequired' in result) {
      tempToken.value = result.tempToken
      passwordHint.value = result.passwordHint
      step.value = 'password'
      return
    }
    await navigateTo('/dashboard', { replace: true })
  })
}

function submitPassword() {
  return run(async () => {
    await verifyPassword({ tempToken: tempToken.value, password: password.value })
    await navigateTo('/dashboard', { replace: true })
  })
}

function changeNumber() {
  step.value = 'phone'
  code.value = ''
  delivery.value = null
  resendAvailableAt.value = 0
}
</script>

<template>
  <div class="login">
    <section class="login__card">
      <header class="login__head">
        <p v-if="sessionEnded && step === 'phone'" class="login__notice" role="status">{{ t('login.sessionEnded') }}</p>
        <h1 class="login__title">
          <template v-if="step === 'phone'">{{ t('login.phoneTitle') }}</template>
          <template v-else-if="step === 'code'">{{ t('login.codeTitle') }}</template>
          <template v-else>{{ t('login.passwordTitle') }}</template>
        </h1>
        <p class="login__lede">
          <template v-if="step === 'phone'">{{ t('login.phoneDescription') }}</template>
          <template v-else-if="step === 'code'">
            {{ codeDescription }}
            <button type="button" class="link" :disabled="loading" @click="changeNumber">
              {{ t('login.changeNumber') }}
            </button>
          </template>
          <template v-else>{{ t('login.passwordDescription') }}</template>
        </p>
      </header>

      <Transition name="auth-step" mode="out-in">
        <PhoneStep
          v-if="step === 'phone'"
          key="phone"
          v-model:phone="phone"
          :loading="loading"
          :error="error"
          @submit="requestCode"
        />
        <CodeStep
          v-else-if="step === 'code'"
          key="code"
          v-model:code="code"
          :loading="loading"
          :error="error"
          :resend-seconds="deliveryBlocked ? 0 : resendSeconds"
          :resend-label="resendLabel"
          :length="delivery?.length ?? 5"
          @submit="submitCode"
          @resend="requestResend"
        />
        <PasswordStep
          v-else
          key="password"
          v-model:password="password"
          :hint="passwordHint"
          :loading="loading"
          :error="error"
          @submit="submitPassword"
        />
      </Transition>
    </section>
  </div>
</template>

<style scoped>
/* Phones: a plain page under the bar. Desktop: one 440 card in the middle of the screen. */
.login {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: var(--space-6) var(--page-gutter) var(--space-12);
}

.login__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  width: 100%;
}

.login__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.login__title {
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
}

.login__lede,
.login__notice {
  color: var(--text-muted);
  font: var(--text-body);
}

.login__lede .link {
  font: inherit;
}

@media (min-width: 901px) {
  .login {
    align-items: center;
    justify-content: center;
    padding-block: var(--space-10);
  }

  .login__card {
    max-width: var(--card-focus);
    padding: var(--space-8);
    border-radius: var(--radius-xl);
    background: var(--surface);
  }

  .login__title {
    font: var(--text-h2);
    letter-spacing: var(--tracking-h2);
  }
}

.auth-step-enter-active,
.auth-step-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);
}

.auth-step-enter-from {
  opacity: 0;
  transform: translateX(var(--space-4));
}

.auth-step-leave-to {
  opacity: 0;
  transform: translateX(calc(-1 * var(--space-4)));
}
</style>
