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

useSeoMeta({ title: () => t('login.seoTitle'), description: () => t('seo.description') })

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
    await navigateTo('/people', { replace: true })
  })
}

function submitPassword() {
  return run(async () => {
    await verifyPassword({ tempToken: tempToken.value, password: password.value })
    await navigateTo('/people', { replace: true })
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
  <main class="login-page">
    <section class="login-shell">
      <header class="login-header">
        <div class="brand">
          <span class="brand-symbol" aria-hidden="true"><i /><i /><i /></span>
          <span>{{ t('login.title') }}</span>
        </div>
        <div class="login-controls"><UiLocaleSwitch /><UiThemeToggle /></div>
      </header>

      <aside class="login-story">
        <div class="story-copy">
          <span class="story-kicker">{{ t('login.brandLabel') }}</span>
          <h1>{{ t('login.heroTitle') }}</h1>
          <p>{{ t('login.heroText') }}</p>
        </div>
      </aside>

      <section class="login-panel">
        <div class="login-content">
          <h1 class="mobile-hero">{{ t('login.mobileHeroTitle') }}</h1>

          <div class="login-card">
            <div class="login-progress" aria-hidden="true">
              <span v-for="index in 3" :key="index" :class="{ active: stepIndex >= index - 1 }" />
            </div>

            <div class="login-copy">
              <h2>
                <template v-if="step === 'phone'">{{ t('login.phoneTitle') }}</template>
                <template v-else-if="step === 'code'">{{ t('login.codeTitle') }}</template>
                <template v-else>{{ t('login.passwordTitle') }}</template>
              </h2>
              <p>
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
          </div>

          <section class="trust" :aria-label="t('login.trust.title')">
            <h2 class="trust__title">{{ t('login.trust.title') }}</h2>
            <ul class="trust__list">
              <li>{{ t('login.trust.reads') }}</li>
              <li>{{ t('login.trust.stores') }}</li>
              <li>{{ t('login.trust.delete') }}</li>
            </ul>
            <NuxtLink to="/privacy" class="trust__link">{{ t('login.trust.more') }}</NuxtLink>
          </section>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);
  color: var(--text);
}

.login-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(420px, 0.92fr);
  grid-template-rows: var(--topbar-height) minmax(0, 1fr);
}

.login-header {
  position: relative;
  z-index: 2;
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  padding: 0 clamp(var(--space-8), 5vw, 72px);
  border-bottom: 1px solid var(--border);
  background: var(--glass);
  backdrop-filter: var(--glass-filter);
}

.brand,
.login-controls {
  display: flex;
  align-items: center;
}

.brand {
  gap: var(--space-2);
  font-size: 17px;
  font-weight: 700;
  line-height: 24px;
  letter-spacing: -0.02em;
}

.login-controls {
  gap: var(--space-1);
}

.brand-symbol {
  display: grid;
  grid-template-columns: repeat(3, 4px);
  align-items: end;
  gap: 2px;
  width: var(--control-sm);
  height: var(--control-sm);
  padding: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--accent);
  color: var(--on-accent);
}

.brand-symbol i {
  width: 4px;
  border-radius: var(--radius-full);
  background: currentColor;
}

.brand-symbol i:nth-child(1) {
  height: 8px;
}
.brand-symbol i:nth-child(2) {
  height: 16px;
}
.brand-symbol i:nth-child(3) {
  height: 11px;
}

.login-story {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-12);
  padding: clamp(var(--space-10), 7vw, 96px);
  overflow: hidden;
  background: radial-gradient(circle at 12% 15%, var(--accent-subtle), transparent 30rem), var(--bg);
}

.login-story::after {
  content: '';
  position: absolute;
  right: -160px;
  bottom: -220px;
  width: 480px;
  aspect-ratio: 1;
  border: 1px solid var(--border);
  border-radius: 50%;
  box-shadow: 0 0 0 64px var(--glow);
  pointer-events: none;
}

.story-copy {
  position: relative;
  z-index: 1;
}

.story-copy {
  display: grid;
  gap: var(--space-5);
  max-width: 680px;
}

.story-kicker {
  color: var(--accent-ink);
  font: var(--text-label);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.story-copy h1 {
  max-width: 680px;
  font-family: var(--font-sans);
  font-size: clamp(48px, 5.7vw, 76px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
}

.story-copy p {
  max-width: 560px;
  color: var(--text-muted);
  font-size: clamp(17px, 1.6vw, 21px);
  line-height: 1.55;
}

.login-panel {
  display: grid;
  min-width: 0;
  place-items: center;
  padding: clamp(var(--space-8), 7vw, 96px);
  border-left: 1px solid var(--border);
  background: radial-gradient(circle at 100% 0%, var(--accent-subtle), transparent 26rem), var(--surface);
}

.login-content {
  width: min(100%, 460px);
}
.mobile-hero {
  display: none;
}

.login-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: clamp(var(--space-6), 4vw, var(--space-10));
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--surface);
  box-shadow: var(--shadow);
}

/* What the app reads and keeps: answered before the user types a number. */
.trust {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding: 0 var(--space-2);
}

.trust__title {
  color: var(--text);
  font: var(--text-ui);
  font-weight: 600;
}

.trust__list {
  display: grid;
  gap: var(--space-2);
  padding-left: var(--space-5);
  color: var(--text-muted);
  font: var(--text-small);
}

.trust__link {
  justify-self: start;
  border-radius: var(--radius-xs);
  color: var(--accent-ink);
  font: var(--text-small);
  font-weight: 600;
}

.trust__link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.login-progress {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.login-progress span {
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  transition: background var(--transition-normal);
}

.login-progress span.active {
  background: var(--accent);
}

.login-copy {
  display: grid;
  gap: var(--space-3);
}

.login-copy h2 {
  font: var(--text-h1);
  letter-spacing: -0.02em;
}

.login-copy p {
  color: var(--text-muted);
  font: var(--text-body);
}

.auth-step-enter-active,
.auth-step-leave-active {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
}
.auth-step-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.auth-step-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 1040px) {
  .login-shell {
    grid-template-columns: minmax(0, 1fr) minmax(400px, 0.9fr);
  }
}

@media (max-width: 860px) {
  .login-shell {
    grid-template-columns: 1fr;
    grid-template-rows: var(--topbar-height) minmax(0, 1fr);
  }

  .login-header {
    padding: 0 var(--space-6);
  }
  .login-story {
    display: none;
  }

  .login-panel {
    place-items: start center;
    padding: clamp(var(--space-8), 8vw, var(--space-16)) var(--space-6) var(--space-12);
    border-left: 0;
    background: radial-gradient(circle at 100% 0%, var(--accent-subtle), transparent 24rem), var(--bg);
  }

  .login-content {
    width: min(100%, 520px);
  }
  .mobile-hero {
    display: block;
    margin-bottom: var(--space-8);
    font-family: var(--font-sans);
    font-size: clamp(32px, 8vw, 44px);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.03em;
  }
  .login-card {
    padding: var(--space-8);
  }
}

@media (max-width: 520px) {
  .login-shell {
    grid-template-rows: var(--topbar-height) minmax(0, 1fr);
  }
  .login-header {
    padding: 0 var(--space-5);
    background: transparent;
    backdrop-filter: none;
  }
  .login-panel {
    padding: var(--space-8) var(--space-5) var(--space-10);
  }
  .mobile-hero {
    margin-bottom: var(--space-8);
    font-size: clamp(30px, 8.4vw, 38px);
  }
  .login-card {
    gap: var(--space-6);
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .login-copy h2 {
    font-size: 26px;
    line-height: 32px;
  }
}

@media (max-width: 380px) {
  .brand > span:last-child {
    display: none;
  }
  .login-panel {
    padding-inline: var(--space-4);
  }
  .mobile-hero {
    font-size: 29px;
  }
}
</style>
