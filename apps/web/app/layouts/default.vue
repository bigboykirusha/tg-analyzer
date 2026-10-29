<script setup lang="ts">
/**
 * Public pages: the site header, the page in the shared column and the footer line.
 * Pages with `fit: true` (the landing) fill exactly one desktop screen.
 */
const route = useRoute()
const fit = computed(() => route.meta.fit === true)
</script>

<template>
  <div class="site" :class="{ 'site--fit': fit }">
    <SiteHeader />
    <main class="site-main">
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
