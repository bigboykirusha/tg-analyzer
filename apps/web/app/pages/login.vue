<script setup lang="ts">
import type { CodeDeliveryDto, CodeDeliveryType } from '@tg-analyzer/shared'
import { ApiClientError } from '../composables/useApi'
import { AlertCircle } from '../lib/icons'

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
const stepIndex = computed(() => ({ phone: 0, code: 1, password: 2 })[step.value])

// The policy opens over the login page; old /privacy links land here with #privacy.
const route = useRoute()
const privacyOpen = ref(false)
onMounted(() => {
  if (route.hash === '#privacy') privacyOpen.value = true
})

function closePrivacy() {
  privacyOpen.value = false
  if (route.hash) void navigateTo({ hash: '' }, { replace: true })
}

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

/** Back to where the person was headed (an invitation), never to another site. */
function afterLogin() {
  const next = route.query.next
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
}

function submitCode() {
  return run(async () => {
    const result = await verifyCode({ phone: phone.value, code: code.value, phoneCodeHash: phoneCodeHash.value })
    if ('passwordRequired' in result) {
      tempToken.value = result.tempToken
      passwordHint.value = result.passwordHint
      step.value = 'password'
      return
    }
    await navigateTo(afterLogin(), { replace: true })
  })
}

function submitPassword() {
  return run(async () => {
    await verifyPassword({ tempToken: tempToken.value, password: password.value })
    await navigateTo(afterLogin(), { replace: true })
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
  <UiPageContainer class="login-shell">
    <section class="login-panel">
      <div class="login-card">
        <div class="login-progress" aria-hidden="true">
          <span v-for="index in 3" :key="index" :class="{ active: stepIndex >= index - 1 }" />
        </div>

        <div class="login-copy">
          <h1 class="t-h2">
            <template v-if="step === 'phone'">{{ t('login.phoneTitle') }}</template>
            <template v-else-if="step === 'code'">{{ t('login.codeTitle') }}</template>
            <template v-else>{{ t('login.passwordTitle') }}</template>
          </h1>
          <p class="login-copy__text">
            <template v-if="step === 'phone'">{{ t('login.phoneDescription') }}</template>
            <template v-else-if="step === 'code'">{{ codeDescription }}</template>
            <template v-else>{{ t('login.passwordDescription') }}</template>
          </p>
        </div>

        <Transition name="auth-step" mode="out-in">
          <PhoneStep
            v-if="step === 'phone'"
            key="phone"
            v-model:phone="phone"
            :loading="loading"
            @submit="requestCode"
          />
          <CodeStep
            v-else-if="step === 'code'"
            key="code"
            v-model:code="code"
            :loading="loading"
            :resend-seconds="deliveryBlocked ? 0 : resendSeconds"
            :resend-label="resendLabel"
            :length="delivery?.length ?? 5"
            @submit="submitCode"
            @resend="requestResend"
            @change-number="changeNumber"
          />
          <PasswordStep
            v-else
            key="password"
            v-model:password="password"
            :hint="passwordHint"
            :loading="loading"
            @submit="submitPassword"
          />
        </Transition>

        <div v-if="error" class="banner banner--danger" role="alert">
          <AlertCircle aria-hidden="true" />
          <p class="banner__text">{{ error }}</p>
        </div>

        <p class="trust">
          {{ t('login.trust.short') }}
          <button type="button" class="link" @click="privacyOpen = true">{{ t('login.trust.more') }}</button>
        </p>
      </div>
      <NuxtLink to="/example" class="login-example">{{ t('login.exampleLink') }}</NuxtLink>
    </section>

    <PrivacyDialog :open="privacyOpen" @close="closePrivacy" />
  </UiPageContainer>
</template>

<style scoped>
/* A focused task: one card in the middle of the column; on phones it fills the width. */
.login-shell {
  display: grid;
  flex: 1;
  place-items: start center;
  padding-top: clamp(0px, 6vh, 72px);
}

.login-panel {
  display: grid;
  justify-items: center;
  gap: var(--space-5);
  width: 100%;
  max-width: 440px;
}

.login-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  width: 100%;
  padding: var(--space-8);
  border-radius: var(--radius-card);
  background: var(--surface);
}

.login-example {
  color: var(--text-muted);
  font: var(--text-ui);
  transition: color var(--transition-fast);
}

@media (hover: hover) {
  .login-example:hover {
    color: var(--text);
  }
}

/* One quiet line about privacy, with the policy one tap away. */
.trust {
  padding-top: var(--space-5);
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font: var(--text-small);
}

.login-progress {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-1);
}

.login-progress span {
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  transition: background-color var(--transition-normal);
}

.login-progress span.active {
  background: var(--lime);
}

.login-copy {
  display: grid;
  gap: var(--space-2);
}

.login-copy__text {
  color: var(--text-muted);
  font: var(--text-ui);
  font-weight: 400;
}

.auth-step-enter-active,
.auth-step-leave-active {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
}

.auth-step-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.auth-step-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 640px) {
  .login-shell {
    padding-top: 0;
  }

  .login-card {
    padding: var(--space-5);
    border-radius: var(--radius-card);
  }
}
</style>
