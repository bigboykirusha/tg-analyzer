<script setup lang="ts">
import PhoneStep from '../components/auth/PhoneStep.vue'
import CodeStep from '../components/auth/CodeStep.vue'
import PasswordStep from '../components/auth/PasswordStep.vue'

const auth = useAuthStore()
const { bootstrap, sendCode, verifyCode, verifyPassword } = useAuth()
const { locale, setLocale, t } = useI18n()

const step = ref<'phone' | 'code' | 'password'>('phone')
const phone = ref('')
const code = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const stepIndex = computed(() => ({
  phone: 0,
  code: 1,
  password: 2,
}[step.value]))

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

onMounted(async () => {
  const restored = await bootstrap()
  if (auth.isAuthorized || restored) {
    await navigateTo('/dashboard')
  }
})
</script>

<template>
  <div class="login-page">
    <div class="login-noise" aria-hidden="true" />

    <section class="login-panel animate-scale-in">
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
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  background:
    radial-gradient(circle at top, var(--accent-glow-soft), transparent 24%),
    var(--bg-base);
  overflow: hidden;
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

.login-panel {
  position: relative;
  z-index: 1;
  width: min(100%, 520px);
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
