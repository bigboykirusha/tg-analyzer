<script setup lang="ts" generic="T extends string">
/**
 * A filter of a list as words, the way Telegram shows its folders (14.11): «Все 128 · Личные 96 · Группы 32» — the
 * chosen word in ink with a line under it, the others quiet, a hairline under the row. No pills: the list under it is
 * the content, the filter only a heading of it.
 */
defineProps<{ options: { value: T; label: string; count?: string }[]; label: string }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="tabs" role="radiogroup" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="tabs__item"
      :class="{ 'is-on': model === option.value }"
      :aria-checked="model === option.value"
      @click="model = option.value"
    >
      {{ option.label }}<span v-if="option.count" class="tabs__count">{{ option.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: var(--space-5);
  width: 100%;
  overflow-x: auto;
  box-shadow: var(--divider-bottom);
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

/* A word, as tall as a thumb needs; the chosen one is ink with a line along the row's hairline. */
.tabs__item {
  position: relative;
  flex: none;
  min-height: var(--control-md);
  padding: 0;
  color: var(--text-muted);
  font: var(--text-body);
  white-space: nowrap;
  transition: color var(--transition-fast);
}

.tabs__item.is-on {
  color: var(--text);
}

.tabs__item.is-on::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: var(--space-0-5);
  border-radius: var(--radius-pill);
  background: var(--text);
}

.tabs__count {
  margin-left: var(--space-1);
  color: var(--text-muted);
}

@media (hover: hover) and (pointer: fine) {
  .tabs__item:not(.is-on):hover {
    color: var(--text);
  }
}
</style>
