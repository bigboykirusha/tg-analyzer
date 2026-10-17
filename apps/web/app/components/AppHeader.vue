<script setup lang="ts">
import { Globe, LogOut, Moon, Sun, Trash2 } from '../lib/icons'

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

const navigation = useNavigation()
const isReport = computed(() => route.path.startsWith('/chat/'))
const analysis = useAnalysis()
/** The running analysis, shown in the header on every page. */
const activity = computed(() => {
  if (!analysis.isActive.value) return null
  const { scannedMessages, totalMessages, phase, chatTitle } = analysis.progress.value
  const percent =
    phase === 'saving'
      ? 100
      : totalMessages && phase === 'scanning'
        ? Math.min(99, Math.round((scannedMessages / totalMessages) * 100))
        : null
  return { chat: chatTitle || t('analysis.untitledChat'), percent, queued: analysis.queued.value.length }
})
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
      <nav v-if="navigation.items.value.length > 1" class="main-nav" :aria-label="t('nav.main')">
        <NuxtLink
          v-for="item in navigation.items.value"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :aria-current="navigation.current.value?.to === item.to ? 'page' : undefined"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="topbar-actions">
        <NuxtLink
          v-if="activity"
          to="/dashboard"
          class="activity"
          :aria-label="t('header.activityLabel', { chat: activity.chat })"
          aria-live="polite"
        >
          <span class="activity__spinner" aria-hidden="true" />
          <span class="activity__chat">{{ activity.chat }}</span>
          <span v-if="activity.percent !== null" class="activity__percent">{{ activity.percent }}%</span>
          <span v-if="activity.queued" class="activity__queued">+{{ activity.queued }}</span>
        </NuxtLink>
        <div class="desktop-only">
          <UiLocaleSwitch />
          <UiThemeToggle />
        </div>
        <UiPopoverMenu v-model:open="accountOpen" align="end" :aria-label="displayName" title="">
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

.main-nav {
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

/* Background work: a quiet pill while an analysis runs. */
.activity {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  max-width: 240px;
  min-height: var(--control-sm);
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  background: var(--accent-subtle);
  color: var(--accent-ink);
  font: var(--text-small);
  font-weight: 600;
  transition: background-color var(--transition-fast);
}

@media (hover: hover) {
  .activity:hover {
    background-image: linear-gradient(var(--hover), var(--hover));
  }
}

.activity__spinner {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.activity__chat {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity__percent,
.activity__queued {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}

.activity__queued {
  opacity: 0.75;
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

.mobile-report-toolbar {
  display: none;
}

@media (max-width: 640px) {
  .topbar {
    gap: var(--space-3);
    padding: 0 var(--space-4);
  }

  .desktop-only,
  .activity__chat {
    display: none;
  }

  .nav-link {
    padding: 0 var(--space-3);
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
}
</style>
