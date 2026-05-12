<script setup lang="ts">
import PhoneStep from '../components/auth/PhoneStep.vue'
import CodeStep from '../components/auth/CodeStep.vue'
import PasswordStep from '../components/auth/PasswordStep.vue'

definePageMeta({
  middleware: 'guest',
})

const auth = useAuthStore()
const { sendCode, verifyCode, verifyPassword } = useAuth()
const { locale, setLocale, t } = useI18n()
const runtimeConfig = useRuntimeConfig()

const step = ref<'phone' | 'code' | 'password'>('phone')
const phone = ref('')
const code = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const siteUrl = computed(() => runtimeConfig.public.siteUrl.replace(/\/$/, ''))
const loginUrl = computed(() => `${siteUrl.value}/login`)
const logoPath = '/logo.svg'
const logoUrl = computed(() => `${siteUrl.value}/logo.svg`)
const seoTitle = computed(() => locale.value === 'ru'
  ? 'TG Analyzer - вход в Telegram-аналитику'
  : 'TG Analyzer - Telegram analytics login')
const seoDescription = computed(() => locale.value === 'ru'
  ? 'Войдите в TG Analyzer и анализируйте Telegram-чаты: динамика общения, активность, слова, эмодзи и подробные отчеты.'
  : 'Sign in to TG Analyzer to explore Telegram chat analytics, activity patterns, vocabulary, emoji usage, and focused reports.')
const seoKeywords = computed(() => locale.value === 'ru'
  ? 'telegram analytics, анализ telegram чатов, статистика telegram, tg analyzer, аналитика переписок'
  : 'telegram analytics, telegram chat analysis, telegram stats, tg analyzer, chat insights')

const capabilityCards = computed(() => locale.value === 'ru'
  ? [
      {
        eyebrow: 'Что внутри',
        title: 'Отчет по одному чату без визуального шума',
        body: 'Выбираете диалог, запускаете парсинг и сразу получаете чистую аналитику по динамике, словам, эмодзи и ритму общения.',
      },
      {
        eyebrow: 'Что увидите',
        title: 'Пики активности, баланс диалога и долгие паузы',
        body: 'Сервис показывает, кто ведет разговор, в какие часы чат оживает и где появляются затяжные разрывы в общении.',
      },
      {
        eyebrow: 'Как это работает',
        title: 'Логин через Telegram, без хранения сообщений',
        body: 'Нужен только безопасный вход, после чего строятся агрегированные метрики и обзор поведения без сохранения текста переписки.',
      },
    ]
  : [
      {
        eyebrow: 'Inside the product',
        title: 'One chat, one focused report',
        body: 'Pick a dialog, run parsing, and jump straight into analytics for timing, vocabulary, emoji usage, and conversation rhythm.',
      },
      {
        eyebrow: 'What you can see',
        title: 'Activity peaks, balance, and long silence gaps',
        body: 'The report highlights who drives the conversation, when the chat comes alive, and where long pauses reshape the dynamic.',
      },
      {
        eyebrow: 'How it works',
        title: 'Telegram login with no message storage',
        body: 'You only authorize access, then the app builds aggregate metrics and behavioral views without storing your message content.',
      },
    ])

const quickStats = computed(() => locale.value === 'ru'
  ? [
      { value: '1 чат', label: 'один сфокусированный отчет за запуск' },
      { value: '24ч', label: 'разбивка активности по часам суток' },
    ]
  : [
      { value: '1 chat', label: 'one focused report per run' },
      { value: '24h', label: 'activity split across the day' },
    ])

const featureBullets = computed(() => locale.value === 'ru'
  ? ['Таймлайн активности по дням и месяцам', 'Слова, эмодзи и состав сообщений', 'Инсайты по темпу и взаимности общения']
  : ['Daily and monthly activity timelines', 'Words, emoji, and message composition', 'Insights on tempo and reciprocity'])

const stepIndex = computed(() => ({
  phone: 0,
  code: 1,
  password: 2,
}[step.value]))

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  keywords: () => seoKeywords.value,
  robots: 'index, follow',
  author: 'TG Analyzer',
  applicationName: 'TG Analyzer',
  ogType: 'website',
  ogSiteName: 'TG Analyzer',
  ogLocale: () => locale.value === 'ru' ? 'ru_RU' : 'en_US',
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  ogUrl: () => loginUrl.value,
  ogImage: () => logoUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDescription.value,
  twitterImage: () => logoUrl.value,
})

useHead({
  htmlAttrs: {
    lang: locale,
  },
  link: [
    { rel: 'canonical', href: () => loginUrl.value },
    { rel: 'icon', type: 'image/svg+xml', href: logoPath },
    { rel: 'shortcut icon', href: logoPath },
    { rel: 'apple-touch-icon', href: logoPath },
    { rel: 'alternate', hreflang: 'ru', href: () => loginUrl.value },
    { rel: 'alternate', hreflang: 'en', href: () => loginUrl.value },
    { rel: 'alternate', hreflang: 'x-default', href: () => loginUrl.value },
  ],
  meta: [
    { name: 'theme-color', content: '#0b1220' },
    { name: 'apple-mobile-web-app-title', content: 'TG Analyzer' },
    { name: 'format-detection', content: 'telephone=no' },
  ],
})

async function handlePhone() {
  loading.value = true
  error.value = ''
  try {
    await sendCode(phone.value)
    step.value = 'code'
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('login.sendCodeError')
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

    await navigateTo('/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('login.invalidCodeError')
  } finally {
    loading.value = false
  }
}

async function handlePassword() {
  loading.value = true
  error.value = ''
  try {
    await verifyPassword({ password: password.value })
    await navigateTo('/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('login.invalidPasswordError')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-noise" aria-hidden="true" />
    <div class="login-orbit login-orbit-left" aria-hidden="true" />
    <div class="login-orbit login-orbit-right" aria-hidden="true" />

    <section class="login-shell animate-scale-in">
      <aside class="login-side login-side-left">
        <div class="login-side-block login-side-intro">
          <span class="side-kicker">{{ locale === 'ru' ? 'TG Analyzer' : 'TG Analyzer' }}</span>
          <h2 class="text-h2 side-title">
            {{ locale === 'ru' ? 'Смотрите на характер переписки' : 'See not only volume, but the shape of the conversation' }}
          </h2>
          <p class="text-body side-copy">
            {{ locale === 'ru' ? 'Активность, пики, слова и баланс общения собираются в один короткий отчет по выбранному чату.' : 'Activity, peaks, words, and balance come together in one compact report for the selected chat.' }}
          </p>
        </div>

        <div class="login-stat-grid">
          <article v-for="stat in quickStats" :key="stat.label" class="login-stat-card">
            <strong class="login-stat-value">{{ stat.value }}</strong>
            <span class="text-body-sm">{{ stat.label }}</span>
          </article>
        </div>

        <div class="login-side-block login-side-features">
          <span class="side-kicker">{{ locale === 'ru' ? 'После входа' : 'After sign-in' }}</span>
          <ul class="login-feature-list">
            <li v-for="feature in featureBullets" :key="feature">{{ feature }}</li>
          </ul>
        </div>
      </aside>

      <section class="login-panel">
        <div class="login-brand">
          <span class="brand-mark">&lt;T&gt;</span>
          <div class="brand-copy">
            <div class="brand-topline">
              <h1 class="text-h1">{{ t('login.title') }}</h1>
              <div class="language-switch" :aria-label="t('nav.language')">
                <button type="button" :class="{ active: locale === 'ru' }" @click="setLocale('ru')">RU</button>
                <button type="button" :class="{ active: locale === 'en' }" @click="setLocale('en')">EN</button>
              </div>
            </div>
            <p class="text-body login-lead">{{ t('login.lead') }}</p>
          </div>
        </div>

        <div class="login-progress">
          <div
            v-for="index in 3"
            :key="index"
            class="progress-step"
            :class="{ 'progress-step-active': stepIndex >= index - 1 }"
          />
        </div>

        <div class="login-card">
          <div class="login-copy">
            <span class="text-label">{{ t('login.secure') }}</span>
            <h2 class="text-h2">
              <template v-if="step === 'phone'">{{ t('login.phoneTitle') }}</template>
              <template v-else-if="step === 'code'">{{ t('login.codeTitle') }}</template>
              <template v-else>{{ t('login.passwordTitle') }}</template>
            </h2>
            <p class="text-body-sm">
              <template v-if="step === 'phone'">{{ t('login.phoneDescription') }}</template>
              <template v-else-if="step === 'code'">{{ t('login.codeDescription') }}</template>
              <template v-else>{{ t('login.passwordDescription') }}</template>
            </p>
          </div>

          <Transition name="auth-step" mode="out-in">
            <PhoneStep v-if="step === 'phone'" key="phone" v-model:phone="phone" :loading="loading" @submit="handlePhone" />
            <CodeStep v-else-if="step === 'code'" key="code" v-model:code="code" :loading="loading" @submit="handleCode" />
            <PasswordStep v-else key="password" v-model:password="password" :loading="loading" @submit="handlePassword" />
          </Transition>

          <p v-if="error" class="login-error text-body-sm">
            {{ error }}
          </p>
        </div>

        <div class="login-trust">
          <span class="trust-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8 10V7.75A4 4 0 0 1 12 4a4 4 0 0 1 4 3.75V10m-7.25 0h6.5A1.75 1.75 0 0 1 17 11.75v5.5A1.75 1.75 0 0 1 15.25 19h-6.5A1.75 1.75 0 0 1 7 17.25v-5.5A1.75 1.75 0 0 1 8.75 10Z" />
            </svg>
          </span>
          <p class="text-body-sm">{{ t('login.trust') }}</p>
        </div>
      </section>

      <aside class="login-side login-side-right">
        <article v-for="card in capabilityCards" :key="card.title" class="login-side-card">
          <span class="side-kicker">{{ card.eyebrow }}</span>
          <h3 class="text-h3">{{ card.title }}</h3>
          <p class="text-body-sm">{{ card.body }}</p>
        </article>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: var(--space-6);
  background:
    radial-gradient(circle at top, var(--accent-glow-soft), transparent 24%),
    var(--bg-base);
  overflow: hidden;
}

.login-orbit {
  position: absolute;
  top: 50%;
  width: min(28vw, 360px);
  aspect-ratio: 1;
  border-radius: 999px;
  opacity: 0.32;
  filter: blur(10px);
  transform: translateY(-50%);
  pointer-events: none;
}

.login-orbit-left {
  left: -6vw;
  background:
    radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--accent) 34%, transparent), transparent 60%),
    radial-gradient(circle at 65% 65%, color-mix(in srgb, var(--accent-strong) 26%, transparent), transparent 56%);
}

.login-orbit-right {
  right: -6vw;
  background:
    radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent-glow) 34%, transparent), transparent 58%),
    radial-gradient(circle at 40% 70%, color-mix(in srgb, #7dd3fc 18%, transparent), transparent 58%);
}

.login-shell {
  position: relative;
  z-index: 1;
  width: min(100%, 1440px);
  display: grid;
  grid-template-columns: minmax(260px, 360px) minmax(320px, 560px) minmax(260px, 360px);
  align-items: center;
  gap: clamp(20px, 3vw, 40px);
}

.login-noise {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background-image:
    linear-gradient(var(--grid-line-soft) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line-soft) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(circle at center, black 45%, transparent 85%);
}

.login-side {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-4);
  height: 100%;
}

.login-side-block,
.login-side-card,
.login-stat-card {
  border: 1px solid var(--border-subtle);
  border-radius: calc(var(--radius-lg) + 2px);
  background: color-mix(in srgb, var(--panel-translucent) 88%, transparent);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(12px);
}

.login-side-block,
.login-side-card {
  padding: var(--space-5);
}

.login-side-intro {
  gap: var(--space-3);
}

.side-kicker {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 6px 10px;
  margin-bottom: var(--space-4);
  border-radius: 999px;
  background: var(--accent-muted);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.side-title {
  max-width: 14ch;
  margin-bottom: var(--space-4);
}

.side-copy,
.login-side-card p {
  color: var(--text-secondary);
}

.login-side-card h3 {
  margin-bottom: var(--space-3);
}

.login-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
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

.login-feature-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.login-feature-list li {
  position: relative;
  padding-left: 18px;
  color: var(--text-secondary);
}

.login-feature-list li::before {
  content: '';
  position: absolute;
  top: 0.5em;
  left: 0;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 18%, transparent);
}

.login-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.language-switch {
  display: inline-flex;
  gap: var(--space-1);
  padding: var(--space-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
}

.language-switch button {
  min-width: 36px;
  height: 30px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.language-switch button:hover,
.language-switch button.active {
  background: var(--accent-muted);
  color: var(--accent);
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
  width: 68px;
  height: 68px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 18px;
  box-shadow: var(--shadow-md);
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
  gap: var(--space-6);
  padding: var(--space-8);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--panel-translucent);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(12px);
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
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: var(--color-danger-muted);
  color: var(--color-danger);
}

.login-trust {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-secondary);
}

.trust-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--accent);
}

.trust-icon svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.auth-step-enter-active,
.auth-step-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
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
    grid-template-columns: minmax(0, 1fr);
    max-width: 560px;
  }

  .login-side {
    display: none;
  }
}

@media (max-width: 640px) {
  .login-page {
    padding: var(--space-4);
  }

  .brand-topline {
    align-items: center;
  }

  .language-switch {
    margin-left: auto;
  }

  .login-lead {
    display: none;
  }

  .login-card {
    padding: var(--space-6);
  }

  .brand-mark {
    min-width: 48px;
    width: 48px;
    height: 48px;
  }
}
</style>
