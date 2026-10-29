<script setup lang="ts">
/**
 * The title of an app screen, shown in the top bar instead of on the page:
 * an optional avatar, the one h1, a short meta line and the screen's actions.
 * The bar stays on screen, so the actions are always at hand. Document pages
 * (FAQ, terms) keep `UiPageHeader` in the page.
 */
withDefaults(defineProps<{ title: string; lede?: string }>(), { lede: '' })
</script>

<template>
  <Teleport to="#header-page" defer>
    <div class="page-bar">
      <slot name="leading" />
      <div class="page-bar__copy">
        <h1 class="page-bar__title">{{ title }}</h1>
        <p v-if="lede" class="page-bar__lede t-num" :title="lede">{{ lede }}</p>
      </div>
      <div v-if="$slots.actions" class="page-bar__actions no-print"><slot name="actions" /></div>
    </div>
  </Teleport>
</template>

<style scoped>
.page-bar {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: var(--space-3);
}

.page-bar__copy {
  display: grid;
  min-width: 0;
  flex: 1;
}

.page-bar__title {
  overflow: hidden;
  font: var(--text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-bar__lede {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-bar__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-1);
}
</style>
