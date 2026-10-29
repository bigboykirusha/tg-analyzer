<script setup lang="ts">
/**
 * The top of every page: an optional avatar, the one h1, a lede line and actions on the right.
 * Same type, spacing and alignment everywhere, so pages read as one site.
 */
withDefaults(
  defineProps<{
    title: string
    lede?: string
    /** Chat names: at most two lines with an ellipsis; otherwise the title wraps freely. */
    truncate?: boolean
    titleId?: string
  }>(),
  { lede: '', truncate: false, titleId: undefined },
)
</script>

<template>
  <header class="page-header">
    <div class="page-header__main">
      <slot name="leading" />
      <div class="page-header__copy">
        <h1 :id="titleId" class="t-h1 page-header__title" :class="{ 'page-header__title--truncate': truncate }">
          {{ title }}
        </h1>
        <p v-if="lede || $slots.lede" class="t-lede page-header__lede" :class="{ 'is-compact': $slots.leading }">
          <slot name="lede">{{ lede }}</slot>
        </p>
      </div>
    </div>
    <div v-if="$slots.actions" class="page-header__actions no-print"><slot name="actions" /></div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4) var(--space-6);
  min-width: 0;
}

/* Actions sit to the right while there is room, and drop under the title when there is not. */
.page-header__main {
  display: flex;
  flex: 1 1 320px;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
}

.page-header__copy {
  display: grid;
  flex: 1;
  gap: var(--space-2);
  min-width: 0;
}

.page-header__title--truncate {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow-wrap: anywhere;
}

/* Next to an avatar the lede is a meta line (period, handle), not a paragraph. */
.page-header__lede.is-compact {
  font: var(--text-ui);
  font-weight: 400;
}

.page-header__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
}

@media (max-width: 640px) {
  .page-header__main {
    gap: var(--space-3);
  }

  .page-header__copy {
    gap: var(--space-1);
  }

  .page-header__lede.is-compact {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
