<script setup lang="ts">
import PhoneStep from '../components/auth/PhoneStep.vue'
import CodeStep from '../components/auth/CodeStep.vue'
import PasswordStep from '../components/auth/PasswordStep.vue'
import LocaleSwitch from '../components/ui/LocaleSwitch.vue'
import ThemeToggle from '../components/ui/ThemeToggle.vue'
import { useToast } from '../composables/useToast'
import guestMiddleware from '../middleware/guest'

definePageMeta({ middleware: [guestMiddleware] })

const auth = useAuthStore()
const { sendCode, verifyCode, verifyPassword } = useAuth()
const { locale, t } = useI18n()
const toast = useToast()

const step = ref<'phone' | 'code' | 'password'>('phone')
const phone = ref('')
const code = ref('')
const password = ref('')
const loading = ref(false)
const codeAttemptsLeft = ref(3)
const resendSeconds = ref(0)
let resendTimer: number | null = null

onBeforeUnmount(() => {
  if (resendTimer) window.clearInterval(resendTimer)
})

function startResendTimer() {
  resendSeconds.value = 42
  if (resendTimer) window.clearInterval(resendTimer)
  resendTimer = window.setInterval(() => {
    resendSeconds.value = Math.max(0, resendSeconds.value - 1)
    if (!resendSeconds.value && resendTimer) {
      window.clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

const seoTitle = computed(() =>
  locale.value === 'ru' ? 'TG Analyzer - вход в Telegram-аналитику' : 'TG Analyzer - Telegram analytics login',
)
const seoDescription = computed(() =>
  locale.value === 'ru'
    ? 'Войдите в TG Analyzer и анализируйте Telegram-чаты: динамика общения, активность, слова, эмодзи и подробные отчеты.'
    : 'Sign in to TG Analyzer to explore Telegram chat analytics, activity patterns, vocabulary, emoji usage, and focused reports.',
)
const seoKeywords = computed(() =>
  locale.value === 'ru'
    ? 'telegram analytics, анализ telegram чатов, статистика telegram, tg analyzer, аналитика переписок'
    : 'telegram analytics, telegram chat analysis, telegram stats, tg analyzer, chat insights',
)
const stepIndex = computed(() => ({ phone: 0, code: 1, password: 2 })[step.value])

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDescription.value,
})
useHead({ meta: [{ name: 'keywords', content: () => seoKeywords.value }] })

async function handlePhone() {
  loading.value = true
  try {
    await sendCode(phone.value)
    codeAttemptsLeft.value = 3
    startResendTimer()
    step.value = 'code'
  } catch {
    toast.error(t('login.sendCodeError'))
  } finally {
    loading.value = false
  }
}

async function handleCode() {
  loading.value = true
  try {
    const result = await verifyCode({ phone: phone.value, code: code.value, phoneCodeHash: auth.phoneCodeHash })
    if ('isPasswordRequired' in result && result.isPasswordRequired) {
      step.value = 'password'
      return
    }
    await navigateTo('/dashboard', { replace: true })
  } catch {
    codeAttemptsLeft.value = Math.max(0, codeAttemptsLeft.value - 1)
    toast.error(t('login.invalidCodeError', { count: codeAttemptsLeft.value }))
  } finally {
    loading.value = false
  }
}

async function handleResendCode() {
  if (loading.value || resendSeconds.value > 0) return
  loading.value = true
  try {
    await sendCode(phone.value)
    codeAttemptsLeft.value = 3
    startResendTimer()
  } catch {
    toast.error(t('login.sendCodeError'))
  } finally {
    loading.value = false
  }
}

function handleChangeNumber() {
  step.value = 'phone'
  code.value = ''
  if (resendTimer) window.clearInterval(resendTimer)
  resendTimer = null
  resendSeconds.value = 0
}

async function handlePassword() {
  loading.value = true
  try {
    await verifyPassword({ password: password.value })
    await navigateTo('/dashboard', { replace: true })
  } catch {
    toast.error(t('login.invalidPasswordError'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-shell animate-scale-in">
      <header class="login-header">
        <div class="brand">
          <span class="brand-symbol" aria-hidden="true"><i /><i /><i /></span>
          <span>{{ t('login.title') }}</span>
        </div>
        <div class="login-controls"><LocaleSwitch /><ThemeToggle /></div>
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
                <template v-else-if="step === 'code'">{{ t('login.codeDescription') }}</template>
                <template v-else>{{ t('login.passwordDescription') }}</template>
              </p>
            </div>

            <Transition name="auth-step" mode="out-in">
              <PhoneStep
                v-if="step === 'phone'"
                key="phone"
                v-model:phone="phone"
                :loading="loading"
                @submit="handlePhone"
              />
              <CodeStep
                v-else-if="step === 'code'"
                key="code"
                v-model:code="code"
                :loading="loading"
                :resend-seconds="resendSeconds"
                @submit="handleCode"
                @resend="handleResendCode"
                @change-number="handleChangeNumber"
              />
              <PasswordStep
                v-else
                key="password"
                v-model:password="password"
                :loading="loading"
                @submit="handlePassword"
              />
            </Transition>
          </div>
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
  color: var(--text-primary);
}

.login-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(420px, 0.92fr);
  grid-template-rows: 76px minmax(0, 1fr);
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
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  backdrop-filter: var(--glass-filter);
}

.brand,
.login-controls {
  display: flex;
  align-items: center;
}

.brand {
  gap: var(--space-3);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.login-controls {
  gap: var(--space-4);
}

.brand-symbol {
  display: grid;
  grid-template-columns: repeat(3, 4px);
  align-items: end;
  gap: 3px;
  width: 42px;
  height: 42px;
  padding: 10px;
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
  height: 7px;
}
.brand-symbol i:nth-child(2) {
  height: 18px;
}
.brand-symbol i:nth-child(3) {
  height: 12px;
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
  box-shadow: 0 0 0 64px color-mix(in srgb, var(--accent-subtle) 45%, transparent);
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
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.story-copy h1 {
  max-width: 680px;
  font-family: var(--font-display);
  font-size: clamp(48px, 5.7vw, 76px);
  font-weight: 720;
  line-height: 0.98;
  letter-spacing: -0.06em;
}

.story-copy p {
  max-width: 560px;
  color: var(--text-secondary);
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
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  box-shadow: var(--shadow);
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
  font-family: var(--font-display);
  font-size: clamp(30px, 3vw, 40px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.045em;
}

.login-copy p {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.5;
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
    grid-template-rows: 72px minmax(0, 1fr);
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
    font-family: var(--font-display);
    font-size: clamp(32px, 8vw, 44px);
    font-weight: 720;
    line-height: 1.06;
    letter-spacing: -0.05em;
  }
  .login-card {
    padding: var(--space-8);
  }
}

@media (max-width: 520px) {
  .login-shell {
    grid-template-rows: 64px minmax(0, 1fr);
  }
  .login-header {
    padding: 0 var(--space-5);
    background: transparent;
    backdrop-filter: none;
  }
  .brand {
    gap: 10px;
    font-size: 16px;
  }
  .brand-symbol {
    width: 42px;
    height: 42px;
    padding: 10px;
  }
  .login-controls {
    gap: var(--space-4);
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
    font-size: 30px;
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
