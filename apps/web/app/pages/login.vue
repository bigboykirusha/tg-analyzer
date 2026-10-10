<script setup lang="ts">
import PhoneStep from '../components/auth/PhoneStep.vue'
import CodeStep from '../components/auth/CodeStep.vue'
import PasswordStep from '../components/auth/PasswordStep.vue'
import LocaleSwitch from '../components/ui/LocaleSwitch.vue'
import ThemeToggle from '../components/ui/ThemeToggle.vue'
import guestMiddleware from '../middleware/guest'

definePageMeta({
  middleware: [guestMiddleware],
})

const auth = useAuthStore()
const { sendCode, verifyCode, verifyPassword } = useAuth()
const { locale, t } = useI18n()

const step = ref<'phone' | 'code' | 'password'>('phone')
const phone = ref('')
const code = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})

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

const stepIndex = computed(
  () =>
    ({
      phone: 0,
      code: 1,
      password: 2,
    })[step.value],
)

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDescription.value,
})

useHead({
  meta: [
    {
      name: 'keywords',
      content: () => seoKeywords.value,
    },
  ],
})

async function handlePhone() {
  loading.value = true
  error.value = ''
  try {
    await sendCode(phone.value)
    step.value = 'code'
  } catch {
    error.value = t('login.sendCodeError')
  } finally {
    loading.value = false
  }
}

async function handleCode() {
  loading.value = true
  error.value = ''
  try {
    const result = await verifyCode({
      phone: phone.value,
      code: code.value,
      phoneCodeHash: auth.phoneCodeHash,
    })

    if ('isPasswordRequired' in result && result.isPasswordRequired) {
      step.value = 'password'
      return
    }

    await navigateTo('/dashboard', { replace: true })
  } catch {
    error.value = t('login.invalidCodeError')
  } finally {
    loading.value = false
  }
}

async function handlePassword() {
  loading.value = true
  error.value = ''
  try {
    await verifyPassword({ password: password.value })
    await navigateTo('/dashboard', { replace: true })
  } catch {
    error.value = t('login.invalidPasswordError')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <template v-if="isMounted">
      <div class="login-noise" aria-hidden="true" />
      <div class="login-orbit login-orbit-right" aria-hidden="true" />
    </template>

    <section class="login-shell animate-scale-in">
      <header class="login-header">
        <div class="story-brand">
          <span class="brand-symbol" aria-hidden="true"><i /><i /><i /></span>
          <span>{{ t('login.title') }}</span>
        </div>
        <div class="login-controls">
          <LocaleSwitch />
          <ThemeToggle />
        </div>
      </header>

      <aside class="login-story">
        <div class="story-copy">
          <span class="story-kicker">{{ t('login.brandLabel') }}</span>
          <h2 class="story-title">{{ t('login.heroTitle') }}</h2>
          <p>{{ t('login.heroText') }}</p>
        </div>

        <div class="story-visual" aria-hidden="true">
          <div class="story-metric">
            <strong>{{ t('login.heroMetric') }}</strong>
            <span>{{ t('login.heroMetricLabel') }}</span>
          </div>
          <div class="signal-bars">
            <i
              v-for="height in [24, 42, 30, 58, 76, 50, 88, 68, 44, 62, 34, 52]"
              :key="height"
              :style="{ height: `${height}%` }"
            />
          </div>
        </div>

        <ul class="story-features">
          <li>{{ t('login.featureOne') }}</li>
          <li>{{ t('login.featureTwo') }}</li>
          <li>{{ t('login.featureThree') }}</li>
        </ul>
      </aside>

      <section class="login-panel">
        <div class="login-card">
          <div class="login-copy">
            <div class="login-step-line">
              <span class="t-label">{{ t('login.secure') }}</span>
              <span class="step-count">0{{ stepIndex + 1 }} / 03</span>
            </div>
            <h1 class="t-h2">
              <template v-if="step === 'phone'">{{ t('login.phoneTitle') }}</template>
              <template v-else-if="step === 'code'">{{ t('login.codeTitle') }}</template>
              <template v-else>{{ t('login.passwordTitle') }}</template>
            </h1>
            <p class="t-small">
              <template v-if="step === 'phone'">{{ t('login.phoneDescription') }}</template>
              <template v-else-if="step === 'code'">{{ t('login.codeDescription') }}</template>
              <template v-else>{{ t('login.passwordDescription') }}</template>
            </p>
          </div>

          <div class="login-progress" aria-hidden="true">
            <div
              v-for="index in 3"
              :key="index"
              class="progress-step"
              :class="{ 'progress-step-active': stepIndex >= index - 1 }"
            />
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
              @submit="handleCode"
            />
            <PasswordStep
              v-else
              key="password"
              v-model:password="password"
              :loading="loading"
              @submit="handlePassword"
            />
          </Transition>

          <p v-if="error" class="login-error t-small" role="alert" aria-live="assertive">
            {{ error }}
          </p>
        </div>

        <div class="login-trust">
          <span class="trust-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M8 10V7.75A4 4 0 0 1 12 4a4 4 0 0 1 4 3.75V10m-7.25 0h6.5A1.75 1.75 0 0 1 17 11.75v5.5A1.75 1.75 0 0 1 15.25 19h-6.5A1.75 1.75 0 0 1 7 17.25v-5.5A1.75 1.75 0 0 1 8.75 10Z"
              />
            </svg>
          </span>
          <p class="t-small">{{ t('login.trust') }}</p>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: var(--space-6);
  background: radial-gradient(circle at top, var(--accent-subtle), transparent 18%), var(--bg-base);
  overflow: hidden;
}

.login-orbit {
  position: absolute;
  top: 50%;
  width: min(28vw, 360px);
  aspect-ratio: 1;
  border-radius: 999px;
  opacity: 0.18;
  filter: blur(14px);
  transform: translateY(-50%);
  pointer-events: none;
}

.login-orbit-left {
  left: -6vw;
  background:
    radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--accent) 34%, transparent), transparent 60%),
    radial-gradient(circle at 65% 65%, color-mix(in srgb, var(--accent-hover) 26%, transparent), transparent 56%);
}

.login-orbit-right {
  right: -6vw;
  background:
    radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent-border) 34%, transparent), transparent 58%),
    radial-gradient(circle at 40% 70%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 58%);
}

.login-shell {
  position: relative;
  z-index: 1;
  width: min(100%, 460px);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 0;
}

.login-noise {
  position: absolute;
  inset: 0;
  opacity: 0.1;
  background-image:
    linear-gradient(var(--grid-line-soft) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line-soft) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(circle at center, black 45%, transparent 85%);
}

.login-stat-card {
  border: 1px solid var(--border-subtle);
  border-radius: calc(var(--radius-lg) + 2px);
  background: color-mix(in srgb, var(--panel-translucent) 94%, transparent);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
}

.login-stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
}

.login-stat-card span {
  color: var(--text-secondary);
}

.login-stat-value {
  font-family: var(--font-mono);
  font-size: clamp(18px, 2vw, 24px);
  color: var(--text-primary);
}

.login-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  width: min(100%, 420px);
  margin-inline: auto;
}

.login-brand {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 18px;
  box-shadow: var(--shadow-sm);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
}

.brand-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.login-controls {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.login-lead {
  color: var(--text-secondary);
  max-width: 420px;
}

.login-progress {
  display: flex;
  gap: var(--space-2);
}

.progress-step {
  height: 4px;
  flex: 1;
  border-radius: var(--radius-full);
  background: var(--border-subtle);
  transition: background var(--transition-fast);
}

.progress-step-active {
  background: var(--accent);
}

.login-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  width: 100%;
  max-width: 400px;
  padding: 32px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-surface) 94%, transparent);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(10px);
}

.login-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.login-copy p {
  color: var(--text-secondary);
}

.login-error {
  border: none;
  padding: 0;
  background: transparent;
  color: var(--danger);
}

.login-trust {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  color: var(--text-tertiary);
  text-align: center;
}

.trust-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--accent);
  flex: 0 0 auto;
}

.trust-icon svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.login-trust p {
  max-width: 420px;
}

.auth-step-enter-active,
.auth-step-leave-active {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
}

.auth-step-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.auth-step-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 1180px) {
  .login-shell {
    max-width: 560px;
  }
}

@media (max-width: 640px) {
  .login-page {
    padding: var(--space-4);
  }

  .login-noise,
  .login-orbit {
    display: none;
  }

  .brand-topline {
    align-items: center;
  }

  .login-lead {
    display: none;
  }

  .login-card {
    max-width: none;
    padding: var(--space-5);
  }

  .brand-mark {
    min-width: 48px;
    width: 48px;
    height: 48px;
  }

  .login-panel {
    gap: var(--space-4);
  }
}

/* Signal Studio composition */
.login-page {
  align-items: center;
  padding: clamp(16px, 3vw, 48px);
  background:
    radial-gradient(circle at 82% 8%, color-mix(in srgb, var(--accent-2) 16%, transparent), transparent 26rem),
    radial-gradient(circle at 8% 92%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 30rem),
    var(--bg-base);
}

.login-shell {
  width: min(100%, 1180px);
  min-height: min(760px, calc(100dvh - 64px));
  grid-template-columns: minmax(0, 1.12fr) minmax(390px, 0.88fr);
  align-items: stretch;
  border: 1px solid var(--border-default);
  border-radius: 32px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.login-story {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-10);
  min-width: 0;
  padding: clamp(32px, 5vw, 72px);
  background: var(--bg);
  color: var(--text-primary);
  overflow: hidden;
}

.login-story::before {
  content: '';
  position: absolute;
  right: -120px;
  bottom: -160px;
  width: 420px;
  height: 420px;
  border: 1px solid var(--glass-border);
  border-radius: 50%;
  box-shadow: var(--shadow);
}

.story-brand,
.mobile-brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.brand-symbol {
  display: grid;
  grid-template-columns: repeat(3, 5px);
  align-items: end;
  gap: 3px;
  width: 36px;
  height: 36px;
  padding: 9px;
  border-radius: 12px;
  background: var(--accent);
  color: var(--on-accent);
}

.brand-symbol i {
  display: block;
  width: 5px;
  border-radius: 999px;
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
  background: var(--accent-2);
}

.story-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: 560px;
}

.story-kicker {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.story-title {
  max-width: 620px;
  font-family: var(--font-display);
  font-size: clamp(42px, 5.4vw, 74px);
  font-weight: 720;
  line-height: 0.98;
  letter-spacing: -0.06em;
}

.story-copy p {
  max-width: 480px;
  color: var(--text-muted);
  font-size: clamp(16px, 1.7vw, 20px);
  line-height: 1.55;
}

.story-visual {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: end;
  gap: var(--space-8);
  min-height: 150px;
  padding: var(--space-6);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  background: var(--glass);
}

.story-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.story-metric strong {
  font-size: clamp(34px, 4vw, 52px);
  line-height: 1;
  letter-spacing: -0.05em;
}

.story-metric span {
  color: var(--text-muted);
  font-size: 12px;
}

.signal-bars {
  display: flex;
  align-items: end;
  gap: clamp(4px, 0.7vw, 9px);
  height: 96px;
}

.signal-bars i {
  flex: 1;
  min-width: 4px;
  border-radius: 999px 999px 3px 3px;
  background: var(--accent);
}

.signal-bars i:nth-child(3n) {
  background: var(--accent-2);
}

.story-features {
  position: relative;
  z-index: 1;
  display: flex;
  gap: var(--space-6);
  flex-wrap: wrap;
  color: var(--text-muted);
  font-size: 12px;
  list-style: none;
}

.story-features li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.story-features li::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-2);
}

.login-panel {
  justify-content: center;
  width: 100%;
  padding: clamp(28px, 5vw, 64px);
}

.login-controls {
  position: absolute;
  top: clamp(24px, 3vw, 40px);
  right: clamp(24px, 3vw, 40px);
}

.mobile-brand {
  display: none;
  color: var(--text-primary);
}

.login-card {
  max-width: none;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.login-copy {
  gap: var(--space-3);
}

.login-copy .t-h2 {
  max-width: 380px;
  font-size: clamp(30px, 3vw, 44px);
  line-height: 1.05;
  letter-spacing: -0.045em;
}

.login-step-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.step-count {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 11px;
}

.login-progress {
  order: 0;
  gap: 6px;
}

.progress-step {
  height: 3px;
}

.login-trust {
  align-items: flex-start;
  justify-content: flex-start;
  text-align: left;
}

.login-trust p {
  max-width: none;
}

@media (max-width: 900px) {
  .login-page {
    align-items: stretch;
    padding: 0;
    overflow: auto;
  }

  .login-shell {
    min-height: 100dvh;
    grid-template-columns: 1fr;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .login-story {
    display: none;
  }

  .login-panel {
    min-height: 100dvh;
    justify-content: flex-start;
    padding: 88px clamp(20px, 7vw, 72px) 32px;
  }

  .mobile-brand {
    display: flex;
    margin-bottom: var(--space-6);
  }

  .mobile-brand .brand-symbol {
    background: var(--accent);
  }
}

@media (max-width: 480px) {
  .login-panel {
    padding-inline: var(--space-5);
  }

  .login-controls {
    top: var(--space-5);
    right: var(--space-5);
  }

  .login-trust {
    margin-top: var(--space-2);
  }
}

/* Reference composition: an editorial left panel and a focused auth form. */
@media (min-width: 901px) {
  .login-page {
    padding: 0;
    background: var(--bg);
  }
  .login-shell {
    width: 100%;
    max-width: none;
    min-height: 100dvh;
    grid-template-columns: minmax(0, 1fr) minmax(520px, 1fr);
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .login-story {
    padding: clamp(48px, 7vw, 88px);
    background: var(--bg);
    color: var(--text-primary);
  }
  .login-story::before {
    display: none;
  }
  .login-panel {
    position: relative;
    padding: clamp(48px, 9vw, 12vw);
    background: radial-gradient(70% 380px at 85% 0, var(--glow), transparent), var(--bg);
  }
  .story-kicker,
  .story-copy p,
  .story-metric span,
  .story-features {
    color: var(--text-muted);
  }
  .story-title {
    font-size: clamp(48px, 5vw, 76px);
    color: var(--text-primary);
  }
  .story-visual {
    border-color: var(--border);
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .signal-bars i {
    background: var(--accent);
  }
  .signal-bars i:nth-child(3n) {
    background: var(--accent-2);
  }
}

.brand-symbol {
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
}
.brand-symbol i:nth-child(3) {
  background: currentColor;
}
.login-card {
  color: var(--text-primary);
}
.story-features li::before {
  background: var(--accent-2);
}
@media (max-width: 900px) {
  .mobile-brand .brand-symbol {
    background: var(--accent);
  }
}

@media (min-width: 901px) {
  .login-story {
    justify-content: flex-start;
  }

  .story-copy {
    margin-top: auto;
  }

  .story-visual {
    display: block;
    min-height: 0;
    margin-top: var(--space-8);
    padding: var(--space-6) 0 0;
    border: 0;
    border-top: 1px solid var(--border);
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .signal-bars,
  .story-features {
    display: none;
  }

  .story-metric {
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-2);
  }

  .story-metric strong {
    font-size: 24px;
  }
}

@media (max-width: 900px) {
  .login-panel {
    justify-content: center;
    padding: 112px clamp(20px, 7vw, 72px) 48px;
  }

  .mobile-brand {
    position: absolute;
    top: var(--space-5);
    left: var(--space-5);
    margin: 0;
  }

  .login-controls {
    top: var(--space-4);
  }
}

/* Unified shell: one top rail, aligned columns and stable responsive rhythm. */
.login-shell {
  grid-template-rows: 72px minmax(0, 1fr);
}

.login-header {
  position: relative;
  z-index: 3;
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  padding: 0 clamp(var(--space-5), 3vw, var(--space-8));
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  backdrop-filter: var(--glass-filter);
}

.login-header .login-controls {
  position: static;
  margin-left: auto;
}

@media (min-width: 901px) {
  .login-story,
  .login-panel {
    min-height: 0;
  }

  .login-story {
    justify-content: center;
    padding-block: clamp(var(--space-10), 6vh, var(--space-16));
  }

  .story-copy {
    flex: 0 1 auto;
    margin-top: 0;
  }

  .story-visual {
    margin-top: var(--space-10);
  }

  .login-panel {
    padding: clamp(var(--space-10), 7vw, 88px);
  }
}

@media (max-width: 900px) {
  .login-shell {
    grid-template-rows: 70px minmax(0, 1fr);
  }

  .login-header {
    position: sticky;
    top: 0;
    min-height: 70px;
    padding-inline: var(--space-4);
  }

  .login-panel {
    min-height: calc(100dvh - 70px);
    padding: var(--space-8) clamp(var(--space-5), 7vw, 72px) var(--space-10);
  }
}
</style>
