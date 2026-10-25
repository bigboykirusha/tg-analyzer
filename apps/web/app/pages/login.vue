<script setup lang="ts">
import type { CodeDeliveryDto, CodeDeliveryType } from '@tg-analyzer/shared'
import { ApiClientError } from '../composables/useApi'
import { AlertCircle } from '../lib/icons'
import { sampleConversationDays } from '../lib/sample-conversation'

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

useSeoMeta({ title: () => t('login.seoTitle'), description: () => t('seo.description') })

const sampleDays = sampleConversationDays()
/** The headline with its emphasised words set in italic. */
const heroParts = computed(() => {
  const title = t('login.heroTitle')
  const em = t('login.heroTitleEm')
  const at = title.indexOf(em)
  return at < 0
    ? { before: title, em: '', after: '' }
    : { before: title.slice(0, at), em, after: title.slice(at + em.length) }
})
const promises = computed(() => [t('login.promise.texts'), t('login.promise.delete'), t('login.promise.noAi')])

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
  <main class="login-page">
    <header class="login-header">
      <div class="brand">
        <BrandMark :size="30" />
        <span class="brand-name">{{ t('login.title') }}</span>
      </div>
      <div class="login-controls"><UiLocaleSwitch /><UiThemeToggle /></div>
    </header>

    <div class="login-shell">
      <section class="login-story" aria-labelledby="login-hero">
        <p class="t-label story-kicker">{{ t('login.brandLabel') }}</p>
        <h1 id="login-hero" class="story-title">
          {{ heroParts.before }}<em>{{ heroParts.em }}</em
          >{{ heroParts.after }}
        </h1>
        <p class="story-text">{{ t('login.heroText') }}</p>

        <figure class="story-figure">
          <div class="story-legend" aria-hidden="true">
            <span class="t-you">{{ t('login.legendYou') }}</span>
            <span class="t-them">{{ t('login.legendThem') }}</span>
          </div>
          <Seismograph :days="sampleDays" :height="112" animate />
          <figcaption class="story-caption">{{ t('login.sampleCaption') }}</figcaption>
        </figure>

        <ul class="story-promises">
          <li v-for="(promise, index) in promises" :key="index">
            <span class="story-promises__index t-num">{{ String(index + 1).padStart(2, '0') }}</span>
            {{ promise }}
          </li>
        </ul>
      </section>

      <section class="login-panel">
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

          <p class="trust">
            {{ t('login.trust.short') }}
            <button type="button" class="trust__link" @click="privacyOpen = true">{{ t('login.trust.more') }}</button>
          </p>
        </div>
      </section>
    </div>

    <PrivacyDialog :open="privacyOpen" @close="closePrivacy" />
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100dvh;
  background: var(--bg);
  color: var(--text);
}

/* Header and both columns share the page column, like every signed-in page. */
.login-shell {
  width: 100%;
  max-width: calc(var(--page-max) + 2 * var(--page-gutter));
  margin: 0 auto;
  padding-inline: var(--page-gutter);
}

.login-header {
  padding-inline: max(var(--page-gutter), calc((100% - var(--page-max)) / 2));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  min-height: var(--topbar-height);
  border-bottom: 1px solid var(--border);
}

.brand,
.login-controls {
  display: flex;
  align-items: center;
}

.brand {
  gap: var(--space-3);
  font: 600 19px/24px var(--font-display);
  letter-spacing: -0.015em;
}

.login-controls {
  gap: var(--space-1);
}

.login-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  gap: clamp(var(--space-10), 6vw, 88px);
  align-items: start;
  padding-block: clamp(var(--space-10), 7vh, 88px) var(--space-16);
}

.login-story {
  display: grid;
  gap: var(--space-6);
  min-width: 0;
}

.story-kicker {
  color: var(--accent-ink);
}

.story-title {
  font: var(--text-display);
  font-size: clamp(44px, 5vw, 64px);
  line-height: 1.02;
  letter-spacing: -0.03em;
  text-wrap: balance;
}

.story-title em {
  color: var(--you-ink);
  font-style: italic;
  font-weight: 400;
}

.story-text {
  max-width: 34em;
  color: var(--text-muted);
  font-size: 18px;
  line-height: 28px;
}

.story-figure {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-block: var(--space-4);
  border-block: 1px solid var(--border);
}

.story-legend {
  display: flex;
  justify-content: space-between;
  font: var(--text-label);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.story-caption {
  color: var(--text-muted);
  font: var(--text-small);
}

.story-promises {
  display: grid;
  gap: 0;
  list-style: none;
}

.story-promises li {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: var(--space-3);
  padding-block: var(--space-3);
  border-bottom: 1px solid var(--border);
  font: var(--text-ui);
}

.story-promises__index {
  color: var(--text-muted);
  font: var(--text-label);
  line-height: 20px;
}

.login-panel {
  position: sticky;
  top: var(--space-8);
  min-width: 0;
}

.login-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: clamp(var(--space-6), 3vw, var(--space-10));
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

/* One quiet line about privacy, with the policy one tap away. */
.trust {
  padding-top: var(--space-5);
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font: var(--text-small);
}

.trust__link {
  padding: 0;
  border: 0;
  border-radius: var(--radius-xs);
  background: none;
  cursor: pointer;
  color: var(--accent-ink);
  font: var(--text-small);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.login-progress {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.login-progress span {
  height: 3px;
  background: var(--surface-2);
  transition: background var(--transition-normal);
}

.login-progress span.active {
  background: var(--you);
}

.login-copy {
  display: grid;
  gap: var(--space-2);
}

.login-copy h2 {
  font: var(--text-h2);
  letter-spacing: -0.012em;
}

.login-copy p {
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
  transform: translateY(10px);
}
.auth-step-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 900px) {
  .login-shell {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-10);
    padding-block: var(--space-8) var(--space-12);
  }

  /* On phones: the promise, then the form, then the picture and the details. */
  .login-story {
    display: contents;
  }

  .story-kicker,
  .story-title,
  .story-text {
    margin-bottom: calc(var(--space-6) * -1);
  }

  .login-panel {
    position: static;
  }

  .story-figure {
    order: 1;
    margin-top: 0;
  }

  .story-promises {
    order: 2;
  }

  .story-title {
    font-size: clamp(34px, 9vw, 52px);
  }
}

@media (max-width: 520px) {
  .login-card {
    padding: var(--space-5);
  }

  .story-text {
    font-size: 16px;
    line-height: 26px;
  }
}

@media (max-width: 380px) {
  .brand-name {
    display: none;
  }
}
</style>
