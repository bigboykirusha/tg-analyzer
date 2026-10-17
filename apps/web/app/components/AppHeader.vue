<script setup lang="ts">
import { Clock, LayoutGrid, LogOut, Trash2 } from '../lib/icons'

const auth = useAuthStore()
const route = useRoute()
const { deleteAccount, logout } = useAuth()
const { t } = useI18n()
const toast = useToast()
const errorMessage = useErrorMessage()

const accountOpen = ref(false)
const confirmDeleteOpen = ref(false)
const deleting = ref(false)

watch(
  () => route.path,
  () => {
    accountOpen.value = false
  },
)

const isDashboard = computed(() => route.path.startsWith('/dashboard'))
const isHistory = computed(() => route.path.startsWith('/history'))
const isReport = computed(() => route.path.startsWith('/chat/'))
const displayName = computed(() => auth.user?.firstName || auth.user?.username || t('account.anonymous'))
const handle = computed(() => (auth.user?.username ? `@${auth.user.username}` : ''))

function askDeleteAccount() {
  accountOpen.value = false
  confirmDeleteOpen.value = true
}

async function confirmDeleteAccount() {
  deleting.value = true
  try {
    await deleteAccount()
  } catch (error) {
    toast.error(t('account.deleteError'), errorMessage(error))
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

function signOut() {
  accountOpen.value = false
  void logout()
}
</script>

<template>
  <header class="app-navigation" :class="{ 'app-navigation--report': isReport }">
    <div class="topbar glass-surface">
      <NuxtLink to="/dashboard" class="brand" aria-label="TG Analyzer">
        <span class="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span>TG Analyzer</span>
      </NuxtLink>
      <nav class="desktop-nav" :aria-label="t('nav.main')">
        <NuxtLink
          to="/dashboard"
          class="topbar-link"
          :class="{ active: isDashboard }"
          :aria-current="isDashboard ? 'page' : undefined"
        >
          {{ t('nav.chats') }}
        </NuxtLink>
        <NuxtLink
          to="/history"
          class="topbar-link"
          :class="{ active: isHistory }"
          :aria-current="isHistory ? 'page' : undefined"
        >
          {{ t('nav.history') }}
        </NuxtLink>
      </nav>
      <div class="topbar-actions">
        <UiLocaleSwitch class="desktop-locale" />
        <UiThemeToggle />
        <UiPopoverMenu v-model:open="accountOpen" class="account-menu" align="end" :aria-label="displayName">
          <template #trigger>
            <button
              type="button"
              class="account-trigger"
              :aria-expanded="accountOpen"
              :aria-label="displayName"
              @click="accountOpen = !accountOpen"
            >
              <ProfileAvatar :title="displayName" />
            </button>
          </template>
          <div class="account-popover">
            <div class="account-identity">
              <ProfileAvatar :title="displayName" />
              <span>
                <strong>{{ displayName }}</strong>
                <small v-if="handle">{{ handle }}</small>
              </span>
            </div>
            <div class="mobile-account-preferences"><UiLocaleSwitch /></div>
            <UiMenuItem role="menuitem" :icon="LogOut" @click="signOut">{{ t('account.logout') }}</UiMenuItem>
            <div class="account-divider" role="separator" />
            <UiMenuItem role="menuitem" :icon="Trash2" danger @click="askDeleteAccount">
              {{ t('account.delete') }}
            </UiMenuItem>
          </div>
        </UiPopoverMenu>
      </div>
    </div>
    <div id="mobile-report-toolbar" class="mobile-report-toolbar glass-surface" />
    <nav v-if="!isReport" class="mobile-tabbar glass-surface" :aria-label="t('nav.main')">
      <NuxtLink
        to="/dashboard"
        class="mobile-tab"
        :class="{ active: isDashboard }"
        :aria-current="isDashboard ? 'page' : undefined"
      >
        <LayoutGrid :size="18" aria-hidden="true" />
        <span>{{ t('nav.chats') }}</span>
      </NuxtLink>
      <NuxtLink
        to="/history"
        class="mobile-tab"
        :class="{ active: isHistory }"
        :aria-current="isHistory ? 'page' : undefined"
      >
        <Clock :size="18" aria-hidden="true" />
        <span>{{ t('nav.history') }}</span>
      </NuxtLink>
    </nav>
    <UiConfirmDialog
      :open="confirmDeleteOpen"
      :title="t('account.delete')"
      :description="t('account.deleteConfirm')"
      :confirm-label="t('account.delete')"
      variant="danger"
      :loading="deleting"
      @close="confirmDeleteOpen = false"
      @confirm="confirmDeleteAccount"
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
  color: var(--text);
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
  width: 42px;
  height: 42px;
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
  color: var(--text);
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
  width: 42px;
  height: 42px;
  place-items: center;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
.account-menu {
  width: 42px;
  height: 42px;
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
  border-bottom: 1px solid var(--border);
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
  background: var(--border);
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
    background: var(--glass-sheen), color-mix(in srgb, var(--glass) 92%, var(--bg));
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
    border-bottom: 1px solid var(--border);
    margin-bottom: 8px;
  }
  .mobile-report-toolbar:not(:empty) {
    display: block;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: clip;
    padding: 10px 16px;
    border-width: 0 0 1px;
    border-radius: 0;
  }
  .app-navigation--report .topbar {
    display: none;
  }
  .app-navigation--report .mobile-report-toolbar:not(:empty) {
    display: flex;
    min-height: 70px;
    align-items: center;
    padding: 14px 20px;
    background: var(--glass-sheen), color-mix(in srgb, var(--glass) 92%, var(--bg));
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
      background-color var(--transition-normal),
      border-color var(--transition-normal),
      box-shadow var(--transition-normal),
      backdrop-filter var(--transition-normal);
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
    color: var(--text);
    box-shadow: var(--shadow);
    transform: translateY(-1px);
  }
}
</style>
