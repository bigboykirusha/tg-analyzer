<script setup lang="ts">
/**
 * Public pages: the site header and the page in the shared column.
 * Pages with `fit: true` (the landing) are exactly one screen, phone or desktop; the page fits itself in (the
 * landing's deck takes the height that is left), only a very short screen scrolls. The footer belongs to the
 * landing on a computer only (privacy, the channel, support, the Telegram notice in one line); a phone and every
 * other page end with their content.
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
    <SiteFooter v-if="fit" />
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

@media (max-width: 900px) {
  .site--fit :deep(.site-footer) {
    display: none;
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
