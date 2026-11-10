<script setup lang="ts">
/**
 * A setting that applies at once, as a list row: a leading avatar or icon, the label with a hint, the
 * switch at the end. The whole row toggles; the input is a real checkbox with role="switch".
 * Track 40 × 24, knob 20; the hit area is the row.
 */
defineProps<{ label: string; hint?: string; disabled?: boolean }>()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="switch-row" :class="{ 'is-disabled': disabled }">
    <span v-if="$slots.leading" class="switch-row__leading"><slot name="leading" /></span>
    <span class="switch-row__body">
      <span class="switch-row__copy">
        <span class="switch-row__label">{{ label }}</span>
        <span v-if="hint" class="switch-row__hint">{{ hint }}</span>
      </span>
      <input v-model="model" type="checkbox" role="switch" class="switch" :disabled="disabled" />
    </span>
  </label>
</template>

<style scoped>
.switch-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.switch-row.is-disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.switch-row__leading {
  display: inline-flex;
  flex: none;
}

.switch-row__body {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
  min-height: var(--row-height);
  padding: var(--space-1) 0;
  box-shadow: var(--divider-bottom);
}

.switch-row__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.switch-row__label {
  font: var(--text-body);
}

.switch-row__hint {
  color: var(--text-muted);
  font: var(--text-label);
}

.switch {
  --switch-inset: var(--space-0-5);
  position: relative;
  flex: none;
  width: var(--switch-width);
  height: var(--switch-height);
  border-radius: var(--radius-pill);
  background: var(--switch-off);
  appearance: none;
  cursor: inherit;
  transition: background-color var(--transition-fast);
}

.switch::after {
  content: '';
  position: absolute;
  top: var(--switch-inset);
  left: var(--switch-inset);
  width: calc(var(--switch-height) - var(--switch-inset) * 2);
  height: calc(var(--switch-height) - var(--switch-inset) * 2);
  border-radius: var(--radius-pill);
  background: var(--switch-knob);
  box-shadow: var(--shadow-float);
  transition: transform var(--duration-fast) var(--spring-snappy);
}

.switch:checked {
  background: var(--accent);
}

.switch:checked::after {
  background: var(--on-accent);
  transform: translateX(calc(var(--switch-width) - var(--switch-height)));
}
</style>
