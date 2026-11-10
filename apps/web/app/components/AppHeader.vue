<script setup lang="ts">
/**
 * The app bar of signed-in screens.
 *
 * Phones and tablets: 56 tall. A screen puts its bar here (UiPageBar: back, title, actions); without
 * one (home) the bar is the bare mark on the left and your avatar on the right — the way to the account.
 * Clear at the top, the material once the page scrolls under it. Over a report's poster the bar takes
 * the poster's colour and its circles turn into poster chips; past the poster it melts into the material.
 *
 * Desktop: only a report keeps a bar (its name after the poster); other screens title themselves.
 */
const auth = useAuthStore()
const route = useRoute()
const { t } = useI18n()
const displayName = computed(() => auth.user?.firstName || auth.user?.username || t('account.anonymous'))
const { scrolled, overPoster, progress, hasPoster } = usePosterHeader()
</script>

<template>
  <header
    class="app-bar"
    data-toolbar
    :class="{ 'is-scrolled': scrolled && !overPoster, 'is-over-poster': overPoster, 'has-poster': hasPoster }"
    :style="hasPoster ? { '--poster-progress': progress } : undefined"
  >
    <div class="app-bar__inner">
      <div id="header-page" class="app-bar__page" />
      <div class="app-bar__home">
        <BrandLink to="/dashboard" bare :current="route.path === '/dashboard'" />
        <NuxtLink to="/account" class="app-bar__account" :aria-label="t('account.settings')">
          <ProfileAvatar :title="displayName" size="sm" />
        </NuxtLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-bar {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  padding-top: env(safe-area-inset-top, 0px);
  transition:
    background-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.app-bar__inner {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: calc(var(--page-max) + var(--page-gutter) * 2);
  min-height: var(--topbar-height);
  margin: 0 auto;
  padding: 0 var(--page-gutter);
}

.app-bar__page {
  display: flex;
  flex: 1;
  min-width: 0;
}

/* Home and any screen without its own bar: the mark and your avatar. */
.app-bar__home {
  display: none;
  flex: 1;
  align-items: center;
  justify-content: space-between;
}

.app-bar:not(:has(.page-bar)) .app-bar__home {
  display: flex;
}

.app-bar:not(:has(.page-bar)) .app-bar__page {
  display: none;
}

/* Your avatar is a floating control: a 44 circle, raised, ringed, a soft shadow. */
.app-bar__account {
  display: inline-grid;
  place-items: center;
  width: var(--control-md);
  height: var(--control-md);
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  box-shadow: var(--shadow-chrome);
  transition: transform var(--duration-press) var(--ease-standard);
}

.app-bar__account:active {
  transform: scale(var(--press-scale));
}

/* Scrolled: the material, one hairline. */
.app-bar.is-scrolled {
  background: var(--room-glass);
  box-shadow: var(--divider-bottom);
  -webkit-backdrop-filter: var(--glass-filter);
  backdrop-filter: var(--glass-filter);
}

/* Over the poster the bar is the poster; its floating circles become chips on it. */
.app-bar.is-over-poster {
  background: var(--poster);
  color: var(--on-poster);
}

.app-bar.is-over-poster :deep(.icon-btn--chrome) {
  background: var(--on-poster-chip);
  box-shadow: none;
  color: var(--on-poster);
}

.app-bar.is-over-poster :deep(.page-bar__copy) {
  opacity: 0;
}

.app-bar :deep(.page-bar__copy) {
  transition: opacity var(--transition-fast);
}

/* Desktop: no bar unless a screen keeps its title in it (the report). */
@media (min-width: 901px) {
  .app-bar {
    display: none;
  }

  .app-bar:has(.page-bar--wide) {
    display: block;
  }

  .app-bar__home {
    display: none !important;
  }

  .app-bar__inner {
    max-width: none;
    min-height: var(--topbar-height);
  }

  /*
   * Over a report's poster the bar takes no room and shows nothing: the poster carries the name and its
   * actions. It arrives as the poster leaves, the name and chapter in the material.
   */
  .app-bar.has-poster {
    margin-bottom: calc(-1 * var(--topbar-height));
  }

  .app-bar.is-over-poster {
    background: transparent;
    pointer-events: none;
  }

  /* The name stays in the tree for screen readers (the page's h1); the actions leave it. */
  .app-bar.is-over-poster :deep(.page-bar) {
    opacity: 0;
  }

  .app-bar.is-over-poster :deep(.page-bar__end) {
    visibility: hidden;
  }

  .app-bar :deep(.page-bar--wide) {
    transition:
      opacity var(--transition-fast),
      visibility var(--transition-fast);
  }
}

@media print {
  .app-bar {
    display: none;
  }
}
</style>
