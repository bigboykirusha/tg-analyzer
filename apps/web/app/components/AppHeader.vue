<script setup lang="ts">
import { Clock, Globe, LayoutGrid, LogOut, Moon, Sun, Trash2 } from '../lib/icons'

const auth = useAuthStore()
const route = useRoute()
const { deleteAccount, logout } = useAuth()
const { t, locale, setLocale } = useI18n()
const { resolved, setPreference } = useTheme()
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
const pageTitle = computed(() => (isHistory.value ? t('nav.history') : t('nav.chats')))
const displayName = computed(() => auth.user?.firstName || auth.user?.username || t('account.anonymous'))
const handle = computed(() => (auth.user?.username ? `@${auth.user.username}` : ''))
const isDark = computed(() => resolved.value === 'dark')

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
        <span class="brand-name">TG Analyzer</span>
      </NuxtLink>
      <span class="mobile-title" aria-hidden="true">{{ pageTitle }}</span>
      <nav class="desktop-nav" :aria-label="t('nav.main')">
        <NuxtLink to="/dashboard" class="nav-link" :aria-current="isDashboard ? 'page' : undefined">
          {{ t('nav.chats') }}
        </NuxtLink>
        <NuxtLink to="/history" class="nav-link" :aria-current="isHistory ? 'page' : undefined">
          {{ t('nav.history') }}
        </NuxtLink>
      </nav>
      <div class="topbar-actions">
        <div class="desktop-only">
          <UiLocaleSwitch />
          <UiThemeToggle />
        </div>
        <UiPopoverMenu v-model:open="accountOpen" align="end" :aria-label="displayName">
          <template #trigger>
            <button
              type="button"
              class="account-trigger"
              aria-haspopup="menu"
              :aria-expanded="accountOpen"
              :aria-label="displayName"
              @click="accountOpen = !accountOpen"
            >
              <ProfileAvatar :title="displayName" size="sm" />
            </button>
          </template>
          <div class="menu-identity">
            <ProfileAvatar :title="displayName" size="sm" />
            <span class="menu-identity__copy">
              <strong class="menu-identity__name">{{ displayName }}</strong>
              <small v-if="handle" class="menu-identity__sub">{{ handle }}</small>
            </span>
          </div>
          <div class="menu-divider" role="separator" />
          <div class="mobile-preferences">
            <UiMenuItem
              role="menuitem"
              :icon="Globe"
              :meta="locale.toUpperCase()"
              @click="setLocale(locale === 'ru' ? 'en' : 'ru')"
            >
              {{ t('nav.language') }}
            </UiMenuItem>
            <UiMenuItem role="menuitem" :icon="isDark ? Sun : Moon" @click="setPreference(isDark ? 'light' : 'dark')">
              {{ isDark ? t('theme.light') : t('theme.dark') }}
            </UiMenuItem>
          </div>
          <UiMenuItem role="menuitem" :icon="LogOut" @click="signOut">{{ t('account.logout') }}</UiMenuItem>
          <div class="menu-divider" role="separator" />
          <UiMenuItem role="menuitem" :icon="Trash2" danger @click="askDeleteAccount">
            {{ t('account.deleteMenu') }}
          </UiMenuItem>
        </UiPopoverMenu>
      </div>
    </div>
    <div id="mobile-report-toolbar" class="mobile-report-toolbar glass-surface" />
    <nav v-if="!isReport" class="tabbar glass-surface" :aria-label="t('nav.main')">
      <NuxtLink to="/dashboard" class="tab" :aria-current="isDashboard ? 'page' : undefined">
        <LayoutGrid aria-hidden="true" />
        <span>{{ t('nav.chats') }}</span>
      </NuxtLink>
      <NuxtLink to="/history" class="tab" :aria-current="isHistory ? 'page' : undefined">
        <Clock aria-hidden="true" />
        <span>{{ t('nav.history') }}</span>
      </NuxtLink>
    </nav>
    <UiConfirmDialog
      :open="confirmDeleteOpen"
      :title="t('account.deleteTitle')"
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
  z-index: var(--z-header);
}

.topbar {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  min-height: var(--topbar-height);
  padding: 0 var(--space-6);
  border-width: 0 0 1px;
  border-color: var(--border);
  border-radius: 0;
  box-shadow: none;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 17px;
  font-weight: 700;
  line-height: 24px;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.brand-mark {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  width: var(--control-sm);
  height: var(--control-sm);
  padding: var(--space-2);
  border-radius: 50%;
  background: var(--accent);
}

.brand-mark i {
  width: 4px;
  border-radius: var(--radius-full);
  background: var(--on-accent);
}

.brand-mark i:nth-child(1) {
  height: 8px;
}

.brand-mark i:nth-child(2) {
  height: 16px;
}

.brand-mark i:nth-child(3) {
  height: 11px;
}

.mobile-title {
  display: none;
}

.desktop-nav {
  display: flex;
  gap: var(--space-1);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  min-height: var(--control-sm);
  padding: 0 var(--space-4);
  border-radius: var(--radius-full);
  color: var(--text-muted);
  font: var(--text-control);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

@media (hover: hover) {
  .nav-link:hover {
    background: var(--hover);
    color: var(--text);
  }
}

.nav-link[aria-current='page'] {
  background: var(--surface-2);
  color: var(--text);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-left: auto;
}

.desktop-only {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.account-trigger {
  display: grid;
  width: var(--control-sm);
  height: var(--control-sm);
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
}

.account-trigger:focus-visible,
.account-trigger[aria-expanded='true'] {
  outline: none;
  box-shadow: var(--focus-ring);
}

.mobile-preferences {
  display: none;
}

.tabbar,
.mobile-report-toolbar {
  display: none;
}

@media (max-width: 640px) {
  .topbar {
    gap: var(--space-3);
    padding: 0 var(--space-4);
  }

  .brand-name,
  .desktop-nav,
  .desktop-only {
    display: none;
  }

  .mobile-title {
    display: block;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font: var(--text-title);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-preferences {
    display: grid;
    gap: var(--space-1);
  }

  .app-navigation--report .topbar {
    display: none;
  }

  .mobile-report-toolbar:not(:empty) {
    display: flex;
    align-items: center;
    min-width: 0;
    min-height: var(--topbar-height);
    padding: var(--space-2) var(--space-4);
    border-width: 0 0 1px;
    border-color: var(--border);
    border-radius: 0;
    box-shadow: none;
  }

  .tabbar {
    position: fixed;
    z-index: var(--z-header);
    right: 0;
    bottom: 0;
    left: 0;
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    padding: var(--space-2) var(--space-2) max(var(--space-3), env(safe-area-inset-bottom));
    border-width: 1px 0 0;
    border-color: var(--border);
    border-radius: 0;
    box-shadow: none;
  }

  .tab {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 2px;
    min-height: var(--control-lg);
    border-radius: var(--radius-md);
    color: var(--text-muted);
    font: var(--text-caption);
    --icon-size: 22px;
  }

  .tab[aria-current='page'] {
    color: var(--accent);
    font-weight: 600;
  }
}
</style>
