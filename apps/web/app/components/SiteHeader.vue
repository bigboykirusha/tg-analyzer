<script setup lang="ts">
import { ArrowLeft } from '../lib/icons'

/**
 * The header of every public page.
 * Phones: the mark with its word and one quiet link (on the landing «Войти», elsewhere «Приватность»);
 * a step inside a flow (sign-in, FAQ, privacy) has a back circle instead of the mark.
 * Desktop: the mark on the column's edge; «Пример отчёта», «Приватность» and «Войти» on the right —
 * except on sign-in, where the footer carries the documents.
 * The example report puts its own bar here (UiPageBar), like a report in the app.
 */
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const step = computed(() => ['/login', '/faq', '/privacy'].includes(route.path))
const showNav = computed(() => route.path !== '/login')
const { overPoster } = usePosterHeader()

function back(event: MouseEvent) {
  if (typeof window.history.state?.back !== 'string') return
  event.preventDefault()
  router.back()
}
</script>

<template>
  <header class="site-header" data-toolbar :class="{ 'is-over-poster': overPoster }">
    <div class="site-header__in">
      <div id="header-page" class="site-header__page" />
      <div class="site-header__default">
        <UiIconButton
          v-if="step"
          class="site-header__back"
          to="/"
          :label="t('common.back')"
          :icon="ArrowLeft"
          tone="chrome"
          no-tooltip
          @click="back"
        />
        <BrandLink class="site-header__brand" :class="{ 'site-header__brand--step': step }" />
        <nav class="site-header__nav" :aria-label="t('nav.main')">
          <template v-if="showNav">
            <NuxtLink to="/example" class="nav-link nav-link--wide">{{ t('site.example') }}</NuxtLink>
            <NuxtLink
              to="/privacy"
              class="nav-link"
              :class="{ 'nav-link--narrow-hidden': route.path === '/' }"
              :aria-current="route.path === '/privacy' ? 'page' : undefined"
            >
              {{ t('site.privacy') }}
            </NuxtLink>
            <NuxtLink v-if="route.path === '/'" to="/login" class="nav-link nav-link--ink site-header__signin-narrow">
              {{ t('site.signIn') }}
            </NuxtLink>
            <UiButton to="/login" size="md" class="site-header__signin-wide">{{ t('site.signIn') }}</UiButton>
          </template>
          <NuxtLink v-else to="/privacy" class="nav-link site-header__privacy-narrow">{{ t('site.privacy') }}</NuxtLink>
        </nav>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  padding-top: env(safe-area-inset-top, 0px);
  background: var(--bg);
}

.site-header.is-over-poster {
  background: var(--poster);
  color: var(--on-poster);
}

.site-header__in {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: calc(var(--page-max) + var(--page-gutter) * 2);
  min-height: var(--topbar-height);
  margin: 0 auto;
  padding: 0 var(--page-gutter);
}

.site-header__page {
  display: flex;
  flex: 1;
  min-width: 0;
}

.site-header__default {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.site-header:not(:has(.page-bar)) .site-header__page,
.site-header:has(.page-bar) .site-header__default {
  display: none;
}

.site-header__nav {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

/* Text links in headers: one look, a full hit area. */
.nav-link {
  display: inline-flex;
  align-items: center;
  min-height: var(--control-md);
  color: var(--text-muted);
  font: var(--text-ui);
}

.nav-link--ink {
  color: var(--text);
}

.nav-link[aria-current='page'] {
  color: var(--text);
}

@media (hover: hover) and (pointer: fine) {
  .nav-link:hover {
    color: var(--text);
  }
}

.nav-link--wide,
.site-header__signin-wide {
  display: none;
}

/* Phones: a step shows the back circle instead of the mark. */
@media (max-width: 900px) {
  .site-header__brand--step {
    display: none;
  }

  .nav-link--narrow-hidden {
    display: none;
  }
}

@media (min-width: 901px) {
  .site-header__back,
  .site-header__signin-narrow {
    display: none;
  }

  .nav-link--wide,
  .site-header__signin-wide {
    display: inline-flex;
  }

  .site-header__privacy-narrow {
    display: none;
  }

  .nav-link {
    min-height: var(--control-sm);
  }
}
</style>
