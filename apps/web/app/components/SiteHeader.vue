<script setup lang="ts">
/**
 * The header of every public page: the logo on the left, the privacy page and
 * «Sign in» on the right. The example report puts its own title and the one
 * action («Analyse a chat») into the bar. On the landing a phone has the big
 * button right under the title, so the bar keeps the logo only.
 */
const { t } = useI18n()
const route = useRoute()
const scrolled = useScrolled()
/** The example report puts its title and actions into the bar (`UiPageBar`); documents keep theirs. */
const isReport = computed(() => route.path === '/example')
</script>

<template>
  <header class="site-header" :class="{ 'is-scrolled': scrolled, 'site-header--report': isReport }">
    <UiPageContainer class="site-header__in">
      <BrandLink class="site-header__brand" :class="{ 'site-header__brand--report': isReport }" />
      <div id="header-page" class="site-header__report" />
      <nav class="site-header__nav" :aria-label="t('nav.main')">
        <NuxtLink
          v-if="!isReport"
          to="/faq"
          class="site-header__link"
          :aria-current="route.path === '/faq' ? 'page' : undefined"
        >
          {{ t('site.privacy') }}
        </NuxtLink>
        <UiButton
          v-if="!isReport && route.path !== '/login'"
          :class="{ 'site-header__signin--landing': route.path === '/' }"
          variant="secondary"
          size="sm"
          to="/login"
        >
          {{ t('site.signIn') }}
        </UiButton>
      </nav>
    </UiPageContainer>
    <!-- A screen with parts (the report) puts its navigation here: one bar, one material, one blur. -->
    <UiPageContainer id="header-sub" class="header-sub" />
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  padding-top: env(safe-area-inset-top, 0px);
  background: var(--bg);
  transition: background-color var(--duration-slow) ease;
}

/* Scrolled: the bar turns into a translucent material and the page slides under it, no hairline. */
.site-header.is-scrolled {
  background: var(--glass);
  -webkit-backdrop-filter: var(--glass-filter);
  backdrop-filter: var(--glass-filter);
}

@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .site-header.is-scrolled {
    background: var(--bg);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

.site-header__in {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  height: var(--topbar-height);
}

.site-header__report {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
}

@media (max-width: 900px) {
  .site-header__brand--report {
    display: none;
  }
}

.site-header__nav {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.site-header__link {
  color: var(--text-muted);
  font: var(--text-ui);
  transition: color var(--transition-fast);
}

@media (pointer: coarse) {
  .site-header__link {
    display: inline-flex;
    align-items: center;
    min-height: var(--control-md);
  }
}

.site-header__link[aria-current='page'] {
  color: var(--text);
}

@media (hover: hover) and (pointer: fine) {
  .site-header__link:hover {
    color: var(--text);
  }
}

@media (max-width: 640px) {
  .site-header__nav {
    gap: var(--space-4);
  }
}
/* Phones: «Privacy» lives in the footer, and the landing's own button is under the title. */
@media (max-width: 640px) {
  .site-header__link,
  .site-header__nav .site-header__signin--landing {
    display: none;
  }
}

/*
 * The screen's navigation (`ReportNav`) sits in the header itself. Phones and
 * tablets give it a second row; wide screens centre it in the first.
 */
.header-sub:empty {
  display: none;
}

.header-sub {
  padding-bottom: var(--space-2);
}

@media (min-width: 1200px) {
  .header-sub {
    position: absolute;
    inset: env(safe-area-inset-top, 0px) 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    height: var(--topbar-height);
    padding-bottom: 0;
    pointer-events: none;
  }

  .header-sub > :deep(*) {
    pointer-events: auto;
  }
}

/* Header buttons are 36 px on phones too; the touch area still reaches 44 px. */
@media (max-width: 640px) and (pointer: coarse) {
  .site-header__nav :deep(.btn--sm) {
    min-height: var(--control-sm);
  }

  .site-header__nav :deep(.btn--icon-only.btn--sm) {
    width: var(--control-sm);
  }

  .site-header__nav :deep(.btn--sm)::before {
    content: '';
    position: absolute;
    inset: -4px;
  }
}
</style>
