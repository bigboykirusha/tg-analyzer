<script setup lang="ts">
import { Clock, LayoutGrid, LogOut, Settings, Trash2 } from '../lib/icons'
import ThemeToggle from './ui/ThemeToggle.vue'
import { useToast } from '../composables/useToast'
import ConfirmDialog from './ui/ConfirmDialog.vue'
import MenuItem from './ui/MenuItem.vue'
import LocaleSwitch from './ui/LocaleSwitch.vue'
import PopoverMenu from './ui/PopoverMenu.vue'

const auth = useAuthStore()
const { deleteAccount, logout, terminateTelegramSession, updateProfile } = useAuth()
const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const mounted = ref(false)
const accountOpen = ref(false)
watch(
  () => route.path,
  () => {
    accountOpen.value = false
  },
)
const securityPending = ref<'telegram' | 'account' | null>(null)
const confirmState = ref<{
  type: 'terminate' | 'delete-account'
  title: string
  description: string
  confirmLabel: string
  variant: 'default' | 'danger'
} | null>(null)

const isDashboardRoute = computed(() => route.path.startsWith('/dashboard'))
const isHistoryRoute = computed(() => route.path.startsWith('/history'))
const isReportRoute = computed(() => route.path.startsWith('/chat/'))
const displayName = computed(() =>
  mounted.value ? auth.user?.firstName || auth.user?.username || t('common.anonymous') : t('common.anonymous'),
)
const displayHandle = computed(() => (mounted.value && auth.user?.username ? `@${auth.user.username}` : ''))

onMounted(() => {
  mounted.value = true
  void syncBrowserTimeZone()
})

function openTerminateConfirm() {
  accountOpen.value = false
  confirmState.value = {
    type: 'terminate',
    title: t('dashboard.terminateTelegram'),
    description: t('dashboard.terminateConfirm'),
    confirmLabel: t('dashboard.terminateTelegram'),
    variant: 'default',
  }
}

function openDeleteAccountConfirm() {
  accountOpen.value = false
  confirmState.value = {
    type: 'delete-account',
    title: t('dashboard.deleteAccount'),
    description: t('dashboard.deleteConfirm'),
    confirmLabel: t('dashboard.deleteAccount'),
    variant: 'danger',
  }
}

async function confirmAction() {
  if (!confirmState.value) return
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

async function syncBrowserTimeZone() {
  if (!import.meta.client || !auth.isAuthorized) return
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (!browserTimeZone || browserTimeZone === auth.user?.timezone) return
  try {
    await updateProfile(browserTimeZone)
  } catch {
    /* non-blocking profile convenience */
  }
}

function closeAndLogout() {
  accountOpen.value = false
  void logout()
}
</script>

<template>
  <header class="app-navigation" :class="{ 'app-navigation--report': isReportRoute }">
    <div class="topbar glass-surface">
      <NuxtLink to="/dashboard" class="brand" aria-label="TG Analyzer"
        ><span class="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>TG Analyzer</span></NuxtLink
      >
      <nav class="desktop-nav" :aria-label="t('dashboard.workspace')">
        <NuxtLink
          to="/dashboard"
          class="topbar-link"
          :class="{ active: isDashboardRoute }"
          :aria-current="isDashboardRoute ? 'page' : undefined"
          >{{ t('dashboard.title') }}</NuxtLink
        >
        <NuxtLink
          to="/history"
          class="topbar-link"
          :class="{ active: isHistoryRoute }"
          :aria-current="isHistoryRoute ? 'page' : undefined"
          >{{ t('common.history') }}</NuxtLink
        >
      </nav>
      <div class="topbar-actions">
        <LocaleSwitch class="desktop-locale" />
        <ThemeToggle />
        <PopoverMenu v-model:open="accountOpen" class="account-menu" align="end" :aria-label="displayName">
          <template #trigger>
            <button
              type="button"
              class="account-trigger interactive-surface"
              :aria-expanded="accountOpen"
              :aria-label="displayName"
              @click="accountOpen = !accountOpen"
            >
              <ProfileAvatar :title="displayName" />
            </button>
          </template>
          <div class="account-popover">
            <div class="account-identity">
              <ProfileAvatar :title="displayName" /><span
                ><strong>{{ displayName }}</strong
                ><small v-if="displayHandle">{{ displayHandle }}</small></span
              >
            </div>
            <div class="mobile-account-preferences"><LocaleSwitch /></div>
            <MenuItem role="menuitem" :icon="Settings" @click="openTerminateConfirm">
              {{ t('dashboard.terminateTelegram') }}
            </MenuItem>
            <MenuItem role="menuitem" :icon="LogOut" @click="closeAndLogout">{{ t('common.logout') }}</MenuItem>
            <div class="account-divider" role="separator" />
            <MenuItem role="menuitem" :icon="Trash2" danger @click="openDeleteAccountConfirm">
              {{ t('dashboard.deleteAccount') }}
            </MenuItem>
          </div>
        </PopoverMenu>
      </div>
    </div>
    <div id="mobile-report-toolbar" class="mobile-report-toolbar glass-surface" />
    <nav class="mobile-tabbar glass-surface" :aria-label="t('dashboard.workspace')">
      <NuxtLink
        to="/dashboard"
        class="mobile-tab"
        :class="{ active: isDashboardRoute }"
        :aria-current="isDashboardRoute ? 'page' : undefined"
        ><LayoutGrid :size="18" aria-hidden="true" /><span>{{ t('dashboard.title') }}</span></NuxtLink
      ><NuxtLink
        to="/history"
        class="mobile-tab"
        :class="{ active: isHistoryRoute }"
        :aria-current="isHistoryRoute ? 'page' : undefined"
        ><Clock :size="18" aria-hidden="true" /><span>{{ t('common.history') }}</span></NuxtLink
      >
    </nav>
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
  </header>
</template>

<style scoped>
.app-navigation {
  position: sticky;
  top: 0;
  z-index: 20;
}
.topbar {
  display: flex;
  align-items: center;
  min-height: 72px;
  gap: var(--space-4);
  margin: 0;
  padding: 10px clamp(var(--space-4), 3vw, var(--space-8));
  border-width: 0 0 1px;
  border-radius: 0;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.03em;
  white-space: nowrap;
}
.brand-mark {
  display: inline-flex;
  align-items: end;
  justify-content: center;
  gap: 3px;
  width: 40px;
  height: 40px;
  padding: 9px;
  border-radius: 50%;
  background: var(--accent);
}
.brand-mark i {
  width: 4px;
  border-radius: var(--radius-full);
  background: var(--on-accent);
}
.brand-mark i:nth-child(1) {
  height: 9px;
}
.brand-mark i:nth-child(2) {
  height: 18px;
}
.brand-mark i:nth-child(3) {
  height: 13px;
}
.desktop-nav {
  display: flex;
  gap: 4px;
  margin-left: 16px;
}
.topbar-link,
.mobile-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: var(--radius-full);
  color: var(--text-muted);
  font-weight: 600;
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}
.topbar-link:hover,
.topbar-link.active {
  background: var(--surface-2);
  color: var(--text-primary);
}
.topbar-link:focus-visible,
.mobile-tab:focus-visible,
.account-trigger:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.account-trigger {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text-primary);
  cursor: pointer;
}
.account-trigger[aria-expanded='true'] {
  border-color: var(--accent-border);
  box-shadow: var(--focus-ring);
}
.account-menu :deep(.popover-panel) {
  width: min(300px, calc(100vw - 32px));
  padding: 8px;
  background: var(--surface);
  border-color: var(--border);
}
.account-popover {
  display: grid;
  gap: 4px;
}
.account-identity {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px 16px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--border-subtle);
}
.account-identity span {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.account-identity strong,
.account-identity small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account-divider {
  height: 1px;
  margin: 4px 8px;
  background: var(--border-subtle);
}
.account-identity small {
  color: var(--text-muted);
}
.mobile-tabbar {
  display: none;
}
.mobile-account-preferences,
.mobile-report-toolbar {
  display: none;
}
@media (max-width: 380px) {
  .brand > span:last-child {
    display: none;
  }
}
@media (max-width: 768px) {
  .topbar {
    min-height: 70px;
    margin: 0;
    padding: 12px 16px;
    border-width: 0 0 1px;
    border-radius: 0;
    background: var(--glass-sheen), color-mix(in srgb, var(--glass) 92%, var(--bg-base));
    box-shadow: var(--glass-inset);
    backdrop-filter: var(--glass-filter);
  }
  .brand {
    font-size: 18px;
  }
  .desktop-nav,
  .desktop-locale {
    display: none;
  }
  .mobile-account-preferences {
    display: flex;
    padding: 4px 10px;
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: 8px;
  }
  .mobile-report-toolbar:not(:empty) {
    display: block;
    padding: 10px 16px;
    border-width: 0 0 1px;
    border-radius: 0;
  }
  .app-navigation--report .topbar {
    display: none;
  }
  .app-navigation--report .mobile-report-toolbar:not(:empty) {
    display: block;
    min-height: 70px;
    padding: 10px 16px;
    background: var(--glass-sheen), color-mix(in srgb, var(--glass) 92%, var(--bg-base));
    box-shadow: var(--glass-inset);
    backdrop-filter: var(--glass-filter);
  }
  .topbar-actions {
    gap: 12px;
  }
  .mobile-tabbar {
    position: fixed;
    z-index: 30;
    right: 16px;
    bottom: max(16px, env(safe-area-inset-bottom));
    left: 16px;
    display: flex;
    padding: 4px;
    border-radius: var(--radius-full);
    transition:
      background-color var(--transition-base),
      border-color var(--transition-base),
      box-shadow var(--transition-base),
      backdrop-filter var(--transition-base);
  }
  .mobile-tab {
    flex: 1;
    gap: 7px;
    min-width: 0;
    padding: 0 10px;
    font-size: 14px;
    border-radius: calc(var(--radius-full) - 4px);
    transition:
      color var(--transition-fast),
      background-color var(--transition-fast),
      transform var(--transition-fast);
  }
  .mobile-tab.active {
    background: var(--surface-2);
    color: var(--text-primary);
    box-shadow: var(--shadow-xs);
    transform: translateY(-1px);
  }
}
</style>
