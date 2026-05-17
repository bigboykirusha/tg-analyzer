<script setup lang="ts">
import { BarChart2, Globe, LayoutGrid, LogOut } from '../lib/icons'
import Button from './ui/Button.vue'
import ConfirmDialog from './ui/ConfirmDialog.vue'

const auth = useAuthStore()
const { deleteAccount, logout, terminateTelegramSession } = useAuth()
const route = useRoute()
const { locale, setLocale, t } = useI18n()
const toast = useToast()

const isChatRoute = computed(() => route.path.startsWith('/chat/'))
const isDashboardRoute = computed(() => route.path.startsWith('/dashboard'))
const securityPending = ref<'telegram' | 'account' | null>(null)
const confirmState = ref<{
  type: 'terminate' | 'delete-account'
  title: string
  description: string
  confirmLabel: string
  variant: 'default' | 'danger'
} | null>(null)

function openTerminateConfirm() {
  confirmState.value = {
    type: 'terminate',
    title: t('dashboard.terminateTelegram'),
    description: t('dashboard.terminateConfirm'),
    confirmLabel: t('dashboard.terminateTelegram'),
    variant: 'default',
  }
}

function openDeleteAccountConfirm() {
  confirmState.value = {
    type: 'delete-account',
    title: t('dashboard.deleteAccount'),
    description: t('dashboard.deleteConfirm'),
    confirmLabel: t('dashboard.deleteAccount'),
    variant: 'danger',
  }
}

async function confirmAction() {
  if (!confirmState.value) {
    return
  }

  if (confirmState.value.type === 'terminate') {
    securityPending.value = 'telegram'
    try {
      await terminateTelegramSession()
      toast.success(t('dashboard.terminateTelegram'))
      confirmState.value = null
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('dashboard.terminateError'))
    } finally {
      securityPending.value = null
    }
    return
  }

  securityPending.value = 'account'
  try {
    await deleteAccount()
    confirmState.value = null
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('dashboard.deleteError'))
  } finally {
    securityPending.value = null
  }
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-top">
      <div class="sidebar-logo">
        <span class="logo-mark">&lt;T&gt;</span>
        <span class="logo-text">tg analyzer</span>
      </div>

      <div class="sidebar-user">
        <ProfileAvatar :title="auth.user?.firstName || auth.user?.username || t('common.anonymous')" />
        <div class="user-info">
          <span class="user-name">{{ auth.user?.firstName || auth.user?.username || t('common.anonymous') }}</span>
          <span class="user-handle">@{{ auth.user?.username || t('common.telegram') }}</span>
        </div>
        <button class="logout-button" type="button" @click="logout">
          <LogOut :size="18" :stroke-width="1.5" aria-hidden="true" />
        </button>
      </div>

      <div class="language-switch" :aria-label="t('nav.language')">
        <span class="language-icon" aria-hidden="true">
          <Globe :size="14" :stroke-width="1.5" />
        </span>
        <button type="button" :class="{ active: locale === 'ru' }" @click="setLocale('ru')">RU</button>
        <button type="button" :class="{ active: locale === 'en' }" @click="setLocale('en')">EN</button>
      </div>
    </div>

    <nav class="sidebar-nav">
      <NuxtLink to="/dashboard" class="nav-item" :class="{ 'nav-item-active': route.path.startsWith('/dashboard') }">
        <LayoutGrid :size="18" :stroke-width="1.5" aria-hidden="true" />
        <span>{{ t('common.dashboard') }}</span>
      </NuxtLink>

      <NuxtLink v-if="isChatRoute" :to="route.fullPath" class="nav-item" :class="{ 'nav-item-active': isChatRoute }">
        <BarChart2 :size="18" :stroke-width="1.5" aria-hidden="true" />
        <span>{{ t('common.report') }}</span>
      </NuxtLink>
    </nav>

    <div v-if="isDashboardRoute" class="desktop-security">
      <div class="sidebar-security-copy">
        <span class="text-label">{{ t('dashboard.securityLabel') }}</span>
        <strong class="security-title">{{ t('dashboard.securityTitle') }}</strong>
        <p class="security-text">{{ t('dashboard.securityText') }}</p>
      </div>

      <div v-if="!auth.telegramSessionActive" class="sidebar-security-banner">
        {{ t('dashboard.sessionInactive') }}
      </div>

      <div class="sidebar-security-actions">
        <Button variant="secondary" size="md" block :loading="securityPending === 'telegram'" @click="openTerminateConfirm">
          {{ securityPending === 'telegram' ? t('dashboard.stopping') : t('dashboard.terminateTelegram') }}
        </Button>
        <Button variant="danger" size="md" block :loading="securityPending === 'account'" @click="openDeleteAccountConfirm">
          {{ securityPending === 'account' ? t('dashboard.deleting') : t('dashboard.deleteAccount') }}
        </Button>
        <Button v-if="!auth.telegramSessionActive" variant="primary" size="md" block @click="logout">
          {{ t('common.relogin') }}
        </Button>
      </div>
    </div>

    <div class="sidebar-spacer" />

    <div class="mobile-topbar">
      <div class="mobile-brand">
        <span class="logo-mark">&lt;T&gt;</span>
        <span class="logo-text">tg analyzer</span>
      </div>
      <div class="mobile-actions">
      <NuxtLink to="/dashboard" class="mobile-nav-item" :class="{ 'mobile-nav-item-active': route.path.startsWith('/dashboard') }">
        <LayoutGrid :size="18" :stroke-width="1.5" aria-hidden="true" />
        <span class="screen-reader">{{ t('common.dashboard') }}</span>
      </NuxtLink>
      <NuxtLink v-if="isChatRoute" :to="route.fullPath" class="mobile-nav-item mobile-nav-item-active">
        <BarChart2 :size="18" :stroke-width="1.5" aria-hidden="true" />
        <span class="screen-reader">{{ t('common.report') }}</span>
      </NuxtLink>
      <button class="mobile-nav-item mobile-language" type="button" @click="setLocale(locale === 'ru' ? 'en' : 'ru')">
        <Globe :size="16" :stroke-width="1.5" aria-hidden="true" />
        {{ locale.toUpperCase() }}
        <span class="screen-reader">{{ t('nav.language') }}</span>
      </button>
      </div>
    </div>

    <ConfirmDialog
      :open="Boolean(confirmState)"
      :title="confirmState?.title ?? ''"
      :description="confirmState?.description ?? ''"
      :confirm-label="confirmState?.confirmLabel ?? ''"
      :cancel-label="t('common.cancel')"
      :variant="confirmState?.variant ?? 'default'"
      :loading="securityPending !== null"
      @close="confirmState = null"
      @confirm="confirmAction"
    />
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  border-right: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  overflow-y: auto;
}

.sidebar-top {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-2);
}

.logo-mark {
  font-family: var(--font-mono);
  font-size: 18px;
  color: var(--accent);
}

.logo-text {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--text-primary);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nav-item,
.mobile-nav-item,
.logout-button {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.nav-item {
  position: relative;
  min-height: 44px;
  padding: 0 var(--space-3);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.nav-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.nav-item-active {
  background: var(--accent-subtle);
  color: var(--text-primary);
}

.nav-item-active::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  border-radius: 999px;
  background: var(--accent);
}

.nav-item :deep(svg),
.mobile-nav-item :deep(svg),
.logout-button :deep(svg),
.language-icon :deep(svg) {
  flex: 0 0 auto;
}

.sidebar-spacer {
  flex: 1;
}

.desktop-security {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-base);
}

.sidebar-security-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.security-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.security-text {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.sidebar-security-banner {
  padding: var(--space-3);
  border: 1px solid rgba(251, 191, 36, 0.18);
  border-radius: var(--radius-md);
  background: var(--warning-subtle);
  color: var(--warning);
  font-size: 12px;
  line-height: 1.5;
}

.sidebar-security-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
}

.user-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-handle {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-button {
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  margin-left: auto;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.logout-button:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.mobile-topbar {
  display: none;
}

.language-switch {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
}

.language-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--text-tertiary);
}

.language-switch button {
  flex: 1;
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
  background: var(--accent-subtle);
  color: var(--text-primary);
}

.mobile-language {
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .sidebar {
    position: sticky;
    top: 0;
    z-index: 40;
    display: block;
    padding: 0 var(--space-4);
    border-right: none;
    border-bottom: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--bg-surface) 90%, transparent);
    backdrop-filter: blur(8px);
    overflow: visible;
  }

  .sidebar-top,
  .sidebar-nav,
  .sidebar-spacer,
  .desktop-security {
    display: none;
  }

  .mobile-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: 52px;
    min-width: 0;
  }

  .mobile-brand,
  .mobile-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .mobile-brand {
    overflow: hidden;
  }

  .mobile-nav-item {
    justify-content: center;
    min-width: 44px;
    height: 44px;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-secondary);
  }

  .mobile-nav-item-active {
    background: var(--accent-subtle);
    color: var(--text-primary);
  }

  .logo-text {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
