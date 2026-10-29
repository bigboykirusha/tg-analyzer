<script setup lang="ts">
/**
 * The header of every public page: the logo on the left, the questions page and
 * «Sign in» on the right. Sticky, flush with the page until it scrolls.
 */
const { t } = useI18n()
const route = useRoute()
const scrolled = useScrolled()
/** The example report puts its title and actions into the bar (`UiPageBar`); documents keep theirs. */
const isReport = computed(() => route.path === '/example')
</script>

<template>
  <header class="site-header" :class="{ 'is-scrolled': scrolled }">
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
          {{ t('site.faq') }}
        </NuxtLink>
        <UiButton v-if="route.path !== '/login'" variant="secondary" size="sm" to="/login">
          {{ t('site.signIn') }}
        </UiButton>
      </nav>
    </UiPageContainer>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  padding-top: env(safe-area-inset-top, 0px);
  background: var(--bg);
  transition: box-shadow var(--duration-slow) ease;
}

.site-header.is-scrolled {
  box-shadow: 0 1px 0 var(--border);
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

@media (max-width: 640px) {
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

.site-header__link[aria-current='page'] {
  color: var(--text);
}

@media (hover: hover) {
  .site-header__link:hover {
    color: var(--text);
  }
}

@media (max-width: 640px) {
  .site-header__nav {
    gap: var(--space-4);
  }
}
</style>
