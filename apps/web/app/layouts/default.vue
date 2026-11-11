<script setup lang="ts">
/**
 * Public pages: the site header, the page in the shared column and the footer line.
 * Pages with `fit: true` (the landing) are exactly one screen, phone or desktop, with no footer: everything they
 * offer is on that screen. The page fits itself in (the landing's deck takes the height that is left); only a very
 * short screen scrolls.
 */
const route = useRoute()
const { t } = useI18n()
const fit = computed(() => route.meta.fit === true)
</script>

<template>
  <div class="site" :class="{ 'site--fit': fit }">
    <a class="skip-link" href="#main">{{ t('common.skipToContent') }}</a>
    <SiteHeader />
    <main id="main" class="site-main" tabindex="-1">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.site {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  overflow-x: clip;
}

.site-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: var(--page-top) 0 var(--page-bottom);
}

.site--fit .site-main {
  padding-bottom: var(--space-4);
}

.site--fit :deep(.site-footer) {
  display: none;
}

/* Phones and tablets: one screen — the small viewport, so Safari's toolbars never cover the bottom. */
@media (max-width: 900px) and (min-height: 560px) {
  .site--fit {
    height: 100svh;
    min-height: 0;
    overflow: clip;
  }

  .site--fit .site-main {
    min-height: 0;
    padding-top: var(--space-2);
  }
}

@media (min-width: 901px) and (min-height: 620px) {
  .site--fit {
    height: 100svh;
    min-height: 620px;
    overflow: clip;
  }

  .site--fit .site-main {
    min-height: 0;
    padding-block: 0;
  }
}
</style>
