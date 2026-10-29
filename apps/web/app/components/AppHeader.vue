<script setup lang="ts">
import { Globe, LogOut, Moon, Settings, Sun } from '../lib/icons'

const auth = useAuthStore()
const route = useRoute()
const { logout } = useAuth()
const { t, locale, setLocale } = useI18n()
const { resolved, setPreference } = useTheme()

const accountOpen = ref(false)

watch(
  () => route.path,
  () => {
    accountOpen.value = false
  },
)

const navigation = useNavigation()

/** The bar sits flush with the page until the page scrolls under it, then shows a hairline. */
const scrolled = useScrolled()
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

function openAccount() {
  accountOpen.value = false
  void navigateTo('/account')
}

function signOut() {
  accountOpen.value = false
  void logout()
}
</script>

<template>
  <header class="app-navigation" :class="{ 'is-scrolled': scrolled }">
    <UiPageContainer class="topbar">
      <BrandLink to="/dashboard" class="topbar__brand" />
      <!-- Each screen puts its title and actions here (`UiPageBar`). -->
      <div id="header-page" class="topbar__page" />
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
          <UiMenuItem role="menuitem" :icon="Settings" @click="openAccount">{{ t('account.settings') }}</UiMenuItem>
          <div class="menu-divider" role="separator" />
          <UiMenuItem role="menuitem" :icon="LogOut" @click="signOut">{{ t('account.logout') }}</UiMenuItem>
        </UiPopoverMenu>
      </div>
    </UiPageContainer>
  </header>
</template>

<style scoped>
.app-navigation {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  padding-top: env(safe-area-inset-top, 0px);
  background: var(--bg);
  transition: box-shadow var(--duration-slow) ease;
}

.app-navigation.is-scrolled {
  box-shadow: 0 1px 0 var(--border);
}

/* The same column as the page below, so the logo lines up with the content. */
.topbar {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  height: var(--topbar-height);
}

/* With the sidebar on screen the logo lives there. */
@media (min-width: 901px) {
  .topbar__brand {
    display: none;
  }
}

/* The screen's title and actions fill the bar between the logo and the profile. */
.topbar__page {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
}

/*
 * Phones: the screen's title takes the logo's place. Screens with a back arrow
 * (a report, /new, the account) drop the profile too, so the name and the
 * period fit; the account is one tap away on the home screen.
 */
@media (max-width: 640px) {
  .topbar:has(.page-bar) .topbar__brand,
  .topbar:has(.page-bar[data-back]) .account-trigger {
    display: none;
  }
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

@media (max-width: 640px) {
  .topbar {
    gap: var(--space-3);
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
}
</style>
