<script setup lang="ts">
import { Bell } from '../lib/icons'

/**
 * The app bar of signed-in screens.
 *
 * Phones and tablets: 56 tall. A screen puts its bar here (UiPageBar: back, title, actions); without
 * one (home) the bar is the bare mark on the left and, on the right, the bell («Уведомления», a dot while there are
 * unread ones) and your avatar — the way to the account.
 * Clear at the top, the material once the page scrolls under it. Over a report's poster the bar takes
 * the poster's colour and its circles turn into poster chips; past the poster it melts into the material.
 *
 * A running analysis away from home is a thin line along the screen's top edge, filling as the chat is read: on
 * home it is the person's ring in «Разобрать ещё», on desktop the card in the sidebar. Nothing floats over the
 * page; the line only says «still going» — the details and cancel are a tap away on home, the result is a toast.
 *
 * Desktop: only a report keeps a bar (its name after the poster); other screens title themselves.
 */
const auth = useAuthStore()
const route = useRoute()
const { t } = useI18n()
const displayName = computed(() => auth.user?.firstName || auth.user?.username || t('account.anonymous'))
const { scrolled, overPoster, progress, hasPoster } = usePosterHeader()
const notifications = useNotificationsStore()
const analysisView = useAnalysisView()
/** The line shows wherever the ring of «Разобрать ещё» does not: every signed-in screen but home. */
const running = computed(() => (route.path === '/dashboard' ? null : analysisView.value))
const bellLabel = computed(() =>
  notifications.unread ? t('notifications.unreadLabel', { count: notifications.unread }) : t('nav.notifications'),
)
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
        <span class="app-bar__end">
          <span class="app-bar__bell">
            <UiIconButton to="/notifications" :icon="Bell" :label="bellLabel" bare no-tooltip />
            <span v-if="notifications.unread" class="app-bar__dot" aria-hidden="true" />
          </span>
          <NuxtLink to="/account" class="app-bar__account" :aria-label="t('account.settings')">
            <ProfileAvatar :title="displayName" size="md" />
          </NuxtLink>
        </span>
      </div>
    </div>
    <span
      v-if="running"
      class="app-bar__progress"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="running.percent ?? undefined"
      :aria-label="running.title"
    >
      <i :style="{ transform: `scaleX(${(running.percent ?? 4) / 100})` }" />
    </span>
  </header>
</template>

<style scoped>
.app-bar {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  padding-top: env(safe-area-inset-top, 0px);
  /* No colour transition: browsers sample this bar's colour for their own chrome, and a half-way colour can stick. */
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

.app-bar__end {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* The bell is the round icon of every bar; unread news is a dot on its shoulder, not a number. */
.app-bar__bell {
  position: relative;
  display: inline-flex;
}

/*
 * The dot sits on the glyph's shoulder, not on the corner of the 44 px tap area (there it hung apart from the bell).
 * The glyph is 20 in a 44 circle: 8 from the top and the right puts the dot's centre on its upper right edge; the
 * paper-coloured ring cuts the bell's line, as a badge on an iOS icon.
 */
.app-bar__dot {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: var(--space-3);
  height: var(--space-3);
  border: var(--space-0-5) solid var(--bg);
  border-radius: var(--radius-pill);
  background: var(--text);
  pointer-events: none;
}

/* Your avatar stands alone, 44 to tap: no ring, no plate around it. */
.app-bar__account {
  display: inline-grid;
  place-items: center;
  width: var(--control-md);
  height: var(--control-md);
  border-radius: var(--radius-pill);
  transition: transform var(--duration-press) var(--ease-standard);
}

.app-bar__account:active {
  transform: scale(var(--press-scale));
}

/*
 * The running analysis: a 2 px line of ink along the top edge of the screen, where browsers draw a page's loading —
 * the same over paper, the material and a poster (under the bar it would underline the poster's chips).
 */
.app-bar__progress {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: var(--space-0-5);
  overflow: hidden;
  pointer-events: none;
}

.app-bar__progress i {
  display: block;
  height: 100%;
  background: currentColor;
  transform-origin: left center;
  transition: transform var(--duration-sheet) var(--ease-standard);
}

/*
 * A phone's status strip takes its colour from a solid bar at the top edge (Safari 26 and the installed app); a
 * transparent bar is skipped and the colour it showed last is kept — a report's poster stayed on the strip over home
 * (13.11). At the top of a page the bar is the page's own paper, so the strip always has a colour to read.
 */
@media (max-width: 900px) {
  .app-bar:not(.is-over-poster, .is-scrolled) {
    background-color: var(--bg);
  }
}

/* Scrolled: the material, one hairline. */
.app-bar.is-scrolled {
  background: var(--header-glass);
  box-shadow: var(--divider-bottom);
  -webkit-backdrop-filter: var(--glass-filter);
  backdrop-filter: var(--glass-filter);
}

/*
 * A report: the bar gives its height back and floats over the poster, transparent, so the poster's material runs
 * up to the screen's edge; its circles become translucent chips on it.
 */
.app-bar.has-poster {
  margin-bottom: calc(-1 * (var(--topbar-height) + env(safe-area-inset-top, 0px)));
}

.app-bar.is-over-poster {
  color: var(--on-poster);
}

@media (max-width: 900px) {
  .app-bar.is-over-poster {
    /* A piece of the poster under it (usePosterHeader): what scrolls up goes under the material, not into the logo. */
    background-color: var(--bar-poster-color, transparent);
    background-image: linear-gradient(var(--bg), var(--bg)), var(--bar-poster-image, none);
    background-position: var(--bar-poster-position, 0 100%);
    background-repeat: var(--bar-poster-repeat, no-repeat);
    background-size: var(--bar-poster-size, 0 0);
  }
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

  /* The sidebar's card tells it here. */
  .app-bar__progress {
    display: none;
  }

  .app-bar__inner {
    max-width: none;
    min-height: var(--topbar-height);
  }

  /*
   * Over a report's poster the bar takes no room and shows nothing: the poster carries the name and its
   * actions. It arrives as the poster leaves, the name and chapter in the material.
   */
  .app-bar.is-over-poster {
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
