<script setup lang="ts">
/** A section of a page: an h2 in the section style, an optional hint and actions, then the content. */
const props = defineProps<{ title: string; hint?: string; id?: string }>()
const fallbackId = useId()
const headingId = computed(() => `${props.id ?? fallbackId}-title`)
</script>

<template>
  <section :id="id" class="page-section" :aria-labelledby="headingId">
    <div class="page-section__head">
      <div class="page-section__copy">
        <h2 :id="headingId" class="t-h3">{{ title }}</h2>
        <p v-if="hint" class="page-section__hint">{{ hint }}</p>
      </div>
      <div v-if="$slots.actions" class="page-section__actions"><slot name="actions" /></div>
    </div>
    <slot />
  </section>
</template>

<style scoped>
.page-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.page-section__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-section__copy {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.page-section__hint {
  color: var(--text-muted);
  font: var(--text-small);
}

.page-section__actions {
  display: flex;
  flex: none;
  gap: var(--space-2);
}
</style>
