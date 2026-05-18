<script setup lang="ts">
import PhoneStep from '../components/auth/PhoneStep.vue'
import CodeStep from '../components/auth/CodeStep.vue'
import PasswordStep from '../components/auth/PasswordStep.vue'

definePageMeta({
  middleware: ['guest'],
})

const auth = useAuthStore()
const { sendCode, verifyCode, verifyPassword } = useAuth()
const { locale, setLocale, t } = useI18n()

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

const seoTitle = computed(() => locale.value === 'ru'
  ? 'TG Analyzer - РІС…РѕРґ РІ Telegram-Р°РЅР°Р»РёС‚РёРєСѓ'
  : 'TG Analyzer - Telegram analytics login')
const seoDescription = computed(() => locale.value === 'ru'
  ? 'Р’РѕР№РґРёС‚Рµ РІ TG Analyzer Рё Р°РЅР°Р»РёР·РёСЂСѓР№С‚Рµ Telegram-С‡Р°С‚С‹: РґРёРЅР°РјРёРєР° РѕР±С‰РµРЅРёСЏ, Р°РєС‚РёРІРЅРѕСЃС‚СЊ, СЃР»РѕРІР°, СЌРјРѕРґР·Рё Рё РїРѕРґСЂРѕР±РЅС‹Рµ РѕС‚С‡РµС‚С‹.'
  : 'Sign in to TG Analyzer to explore Telegram chat analytics, activity patterns, vocabulary, emoji usage, and focused reports.')
const seoKeywords = computed(() => locale.value === 'ru'
  ? 'telegram analytics, Р°РЅР°Р»РёР· telegram С‡Р°С‚РѕРІ, СЃС‚Р°С‚РёСЃС‚РёРєР° telegram, tg analyzer, Р°РЅР°Р»РёС‚РёРєР° РїРµСЂРµРїРёСЃРѕРє'
  : 'telegram analytics, telegram chat analysis, telegram stats, tg analyzer, chat insights')

const stepIndex = computed(() => ({
  phone: 0,
  code: 1,
  password: 2,
}[step.value]))

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  keywords: () => seoKeywords.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDescription.value,
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

    await navigateTo('/dashboard', { replace: true })
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
    await navigateTo('/dashboard', { replace: true })
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('login.invalidPasswordError')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <template v-if="isMounted">
      <div class="login-noise" aria-hidden="true" />
      <div class="login-orbit login-orbit-right" aria-hidden="true" />
    </template>

    <section class="login-shell animate-scale-in">
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
          <div v-for="index in 3" :key="index" class="progress-step"
            :class="{ 'progress-step-active': stepIndex >= index - 1 }" />
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
            <PhoneStep v-if="step === 'phone'" key="phone" v-model:phone="phone" :loading="loading"
              @submit="handlePhone" />
            <CodeStep v-else-if="step === 'code'" key="code" v-model:code="code" :loading="loading"
              @submit="handleCode" />
            <PasswordStep v-else key="password" v-model:password="password" :loading="loading"
              @submit="handlePassword" />
          </Transition>

          <p v-if="error" class="login-error text-body-sm">
            {{ error }}
          </p>
        </div>

        <div class="login-trust">
          <span class="trust-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M8 10V7.75A4 4 0 0 1 12 4a4 4 0 0 1 4 3.75V10m-7.25 0h6.5A1.75 1.75 0 0 1 17 11.75v5.5A1.75 1.75 0 0 1 15.25 19h-6.5A1.75 1.75 0 0 1 7 17.25v-5.5A1.75 1.75 0 0 1 8.75 10Z" />
            </svg>
          </span>
          <p class="text-body-sm">{{ t('login.trust') }}</p>
        </div>
      </section>

    </section>
  </div>
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
  background:
    radial-gradient(circle at top, var(--accent-glow-soft), transparent 18%),
    var(--bg-base);
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
  width: 24px;
  height: 24px;
  color: var(--text-tertiary);
}

.trust-icon svg {
  width: 12px;
  height: 12px;
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

  .language-switch {
    margin-left: auto;
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
</style>

