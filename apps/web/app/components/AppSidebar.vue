<script setup lang="ts">
import { BarChart2, Globe, LayoutGrid, LogOut } from '../lib/icons'
import ParseProgress from './stats/ParseProgress.vue'
import ConfirmDialog from './ui/ConfirmDialog.vue'

const auth = useAuthStore()
const { deleteAccount, logout, terminateTelegramSession } = useAuth()
const route = useRoute()
const { locale, setLocale, t } = useI18n()
const toast = useToast()
const { progress, bootstrapFromServer } = useParseProgress()
const mounted = ref(false)

const isChatRoute = computed(() => route.path.startsWith('/chat/'))
const isDashboardRoute = computed(() => route.path.startsWith('/dashboard'))
const isParseActive = computed(() => progress.value.status === 'running' || progress.value.status === 'pending')
const mobileCancelling = ref(false)
const securityPending = ref<'telegram' | 'account' | null>(null)
const confirmState = ref<{
  type: 'terminate' | 'delete-account'
  title: string
  description: string
  confirmLabel: string
  variant: 'default' | 'danger'
} | null>(null)

const displayName = computed(() => {
  if (!mounted.value) {
    return t('common.anonymous')
  }

  return auth.user?.firstName || auth.user?.username || t('common.anonymous')
})

const displayHandle = computed(() => {
  if (!mounted.value) {
    return t('common.telegram')
  }

  return auth.user?.username || t('common.telegram')
})

onMounted(() => {
  mounted.value = true
})

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

async function cancelActiveParse() {
  mobileCancelling.value = true
  try {
    await useApiFetch('/api/parse/cancel', { method: 'DELETE' })
    await bootstrapFromServer()
    toast.success(t('dashboard.cancelled'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('dashboard.cancelError'))
  } finally {
    mobileCancelling.value = false
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
        <ProfileAvatar :title="displayName" />
        <div class="user-info">
          <span class="user-name">{{ displayName }}</span>
          <span class="user-handle">@{{ displayHandle }}</span>
        </div>
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

    <div class="sidebar-spacer" />

    <div class="sidebar-bottom">
      <div v-if="isDashboardRoute" class="desktop-security">
        <div v-if="!auth.telegramSessionActive" class="sidebar-security-banner">
          {{ t('dashboard.sessionInactive') }}
        </div>

        <div class="sidebar-utility-list">
          <button class="utility-item" type="button" :disabled="securityPending !== null" @click="openTerminateConfirm">
            <span class="utility-copy">
              <span class="utility-label">{{ t('dashboard.terminateTelegram') }}</span>
              <span class="utility-subtext">{{ securityPending === 'telegram' ? t('dashboard.stopping') : t('dashboard.terminateConfirm') }}</span>
            </span>
          </button>
          <button class="utility-item utility-item-danger" type="button" :disabled="securityPending !== null" @click="openDeleteAccountConfirm">
            <span class="utility-copy">
              <span class="utility-label">{{ t('dashboard.deleteAccount') }}</span>
              <span class="utility-subtext">{{ securityPending === 'account' ? t('dashboard.deleting') : t('dashboard.deleteConfirm') }}</span>
            </span>
          </button>
          <button v-if="!auth.telegramSessionActive" class="utility-item utility-item-accent" type="button" @click="logout">
            <span class="utility-copy">
              <span class="utility-label">{{ t('common.relogin') }}</span>
              <span class="utility-subtext">{{ t('dashboard.sessionInactive') }}</span>
            </span>
          </button>
        </div>
      </div>

      <button class="utility-item" type="button" @click="logout">
        <LogOut :size="18" :stroke-width="1.5" aria-hidden="true" />
        <span class="utility-copy">
          <span class="utility-label">{{ t('common.logout') }}</span>
        </span>
      </button>
    </div>

    <div class="mobile-topbar" :class="{ 'mobile-topbar-with-progress': isParseActive }">
      <div class="mobile-topbar-row">
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

      <ParseProgress
        v-if="isParseActive"
        class="mobile-topbar-progress"
        compact
        :current="progress.current"
        :total="progress.total"
        :chat-name="progress.chatName"
        :status="progress.status"
        :message="progress.message"
        :scanned-messages="progress.scannedMessages"
        :start-time="progress.startTime"
        cancellable
        :cancelling="mobileCancelling"
        @cancel="cancelActiveParse"
      />
      
      
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
.mobile-nav-item {
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
.language-icon :deep(svg) {
  flex: 0 0 auto;
}

.sidebar-spacer {
  flex: 1;
}

.sidebar-bottom {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.desktop-security {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-1);
  border-top: 1px solid var(--border-subtle);
}

.sidebar-security-banner {
  padding: var(--space-3);
  border: 1px solid rgba(251, 191, 36, 0.15);
  border-radius: var(--radius-md);
  background: rgba(251, 191, 36, 0.06);
  color: var(--warning);
  font-size: 12px;
  line-height: 1.5;
}

.sidebar-utility-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
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

.utility-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.utility-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.utility-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.utility-item :deep(svg) {
  flex: 0 0 auto;
}

.utility-item-danger:hover {
  background: var(--danger-subtle);
  color: var(--danger);
}

.utility-item-accent:hover {
  background: var(--accent-subtle);
  color: var(--text-primary);
}

.utility-copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.utility-label {
  font-size: 13px;
  font-weight: 500;
  color: inherit;
}

.utility-subtext {
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
    position: relative;
    z-index: 20;
    display: block;
    flex-shrink: 0;
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
  .desktop-security,
  .sidebar-bottom {
    display: none;
  }

  .mobile-topbar {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: var(--space-2);
    min-height: 52px;
    min-width: 0;
    padding-block: calc(var(--space-2) + env(safe-area-inset-top, 0px)) var(--space-2);
  }

  .mobile-topbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
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
    min-width: 40px;
    height: 40px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
  }

  .mobile-nav-item-active {
    background: var(--accent-subtle);
    box-shadow: inset 0 0 0 1px var(--accent-border);
    color: var(--text-primary);
  }

  .logo-text {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-topbar-progress {
    margin-bottom: 2px;
  }
}
</style>
