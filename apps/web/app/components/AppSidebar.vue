<script setup lang="ts">
const auth = useAuthStore()
const { logout } = useAuth()
const route = useRoute()
const { locale, setLocale, t } = useI18n()

const isChatRoute = computed(() => route.path.startsWith('/chat/'))
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
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 6H6.75A1.75 1.75 0 0 0 5 7.75v8.5C5 17.216 5.784 18 6.75 18H10m4-8h-8m8 0-2.5-2.5M14 10l-2.5 2.5" />
          </svg>
        </button>
      </div>

      <div class="language-switch" :aria-label="t('nav.language')">
        <button type="button" :class="{ active: locale === 'ru' }" @click="setLocale('ru')">RU</button>
        <button type="button" :class="{ active: locale === 'en' }" @click="setLocale('en')">EN</button>
      </div>
    </div>

    <nav class="sidebar-nav">
      <NuxtLink to="/dashboard" class="nav-item" :class="{ 'nav-item-active': route.path.startsWith('/dashboard') }">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5.75A1.75 1.75 0 0 1 5.75 4h4.5A1.75 1.75 0 0 1 12 5.75v4.5A1.75 1.75 0 0 1 10.25 12h-4.5A1.75 1.75 0 0 1 4 10.25zm8 0A1.75 1.75 0 0 1 13.75 4h4.5A1.75 1.75 0 0 1 20 5.75v4.5A1.75 1.75 0 0 1 18.25 12h-4.5A1.75 1.75 0 0 1 12 10.25zm-8 8A1.75 1.75 0 0 1 5.75 12h4.5A1.75 1.75 0 0 1 12 13.75v4.5A1.75 1.75 0 0 1 10.25 20h-4.5A1.75 1.75 0 0 1 4 18.25zm8 2.25h8" />
        </svg>
        <span>{{ t('common.dashboard') }}</span>
      </NuxtLink>

      <NuxtLink v-if="isChatRoute" :to="route.fullPath" class="nav-item" :class="{ 'nav-item-active': isChatRoute }">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7.75A1.75 1.75 0 0 1 7.75 6h8.5A1.75 1.75 0 0 1 18 7.75v8.5A1.75 1.75 0 0 1 16.25 18h-8.5A1.75 1.75 0 0 1 6 16.25zM9 10h6m-6 4h4" />
        </svg>
        <span>{{ t('common.report') }}</span>
      </NuxtLink>
    </nav>

    <div class="sidebar-spacer" />

    <div class="mobile-topbar">
      <div class="mobile-brand">
        <span class="logo-mark">&lt;T&gt;</span>
        <span class="logo-text">tg analyzer</span>
      </div>
      <div class="mobile-actions">
      <NuxtLink to="/dashboard" class="mobile-nav-item" :class="{ 'mobile-nav-item-active': route.path.startsWith('/dashboard') }">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5.75A1.75 1.75 0 0 1 5.75 4h4.5A1.75 1.75 0 0 1 12 5.75v4.5A1.75 1.75 0 0 1 10.25 12h-4.5A1.75 1.75 0 0 1 4 10.25zm8 0A1.75 1.75 0 0 1 13.75 4h4.5A1.75 1.75 0 0 1 20 5.75v4.5A1.75 1.75 0 0 1 18.25 12h-4.5A1.75 1.75 0 0 1 12 10.25zm-8 8A1.75 1.75 0 0 1 5.75 12h4.5A1.75 1.75 0 0 1 12 13.75v4.5A1.75 1.75 0 0 1 10.25 20h-4.5A1.75 1.75 0 0 1 4 18.25zm8 2.25h8" />
        </svg>
        <span class="screen-reader">{{ t('common.dashboard') }}</span>
      </NuxtLink>
      <NuxtLink v-if="isChatRoute" :to="route.fullPath" class="mobile-nav-item mobile-nav-item-active">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7.75A1.75 1.75 0 0 1 7.75 6h8.5A1.75 1.75 0 0 1 18 7.75v8.5A1.75 1.75 0 0 1 16.25 18h-8.5A1.75 1.75 0 0 1 6 16.25zM9 10h6m-6 4h4" />
        </svg>
        <span class="screen-reader">{{ t('common.report') }}</span>
      </NuxtLink>
      <button class="mobile-nav-item" type="button" @click="logout">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 6H6.75A1.75 1.75 0 0 0 5 7.75v8.5C5 17.216 5.784 18 6.75 18H10m4-8h-8m8 0-2.5-2.5M14 10l-2.5 2.5" />
        </svg>
        <span class="screen-reader">{{ t('common.logout') }}</span>
      </button>
      <button class="mobile-nav-item mobile-language" type="button" @click="setLocale(locale === 'ru' ? 'en' : 'ru')">
        {{ locale.toUpperCase() }}
        <span class="screen-reader">{{ t('nav.language') }}</span>
      </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  padding: var(--space-3);
  border-right: 1px solid var(--border-subtle);
  background:
    radial-gradient(circle at top, var(--accent-glow-soft), transparent 24%),
    var(--bg-base);
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
  padding: var(--space-2) var(--space-3);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.nav-item:hover {
  background: var(--bg-overlay);
  color: var(--text-primary);
}

.nav-item-active {
  background: var(--accent-muted);
  color: var(--accent);
}

.nav-item svg,
.mobile-nav-item svg,
.logout-button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sidebar-spacer {
  flex: 1;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
}

.user-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
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
}

.logout-button {
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.logout-button:hover {
  background: var(--bg-overlay);
  color: var(--text-primary);
}

.mobile-topbar {
  display: none;
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
  flex: 1;
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

.mobile-language {
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
    padding: var(--space-2) var(--space-3);
    border-right: none;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--panel-translucent-strong);
    backdrop-filter: blur(14px);
    overflow: visible;
  }

  .sidebar-top,
  .sidebar-nav,
  .sidebar-spacer {
    display: none;
  }

  .mobile-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: 44px;
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
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
  }

  .mobile-nav-item-active {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .logo-text {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
