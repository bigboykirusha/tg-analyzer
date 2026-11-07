<script setup lang="ts">
/**
 * An on/off setting that applies at once: a row with the label and a hint on the left, the switch
 * on the right. The whole row toggles; the input is a real checkbox with `role="switch"`.
 */
defineProps<{ label: string; hint?: string; disabled?: boolean }>()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="switch-row" :class="{ 'is-disabled': disabled }">
    <span class="switch-row__copy">
      <span class="switch-row__label">{{ label }}</span>
      <span v-if="hint" class="switch-row__hint">{{ hint }}</span>
    </span>
    <input v-model="model" type="checkbox" role="switch" class="switch" :disabled="disabled" />
  </label>
</template>

<style scoped>
.switch-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-height: var(--hit-min);
  padding: var(--space-2) 0;
  cursor: pointer;
}

.switch-row.is-disabled {
  cursor: default;
  opacity: 0.5;
}

.switch-row__copy {
  display: grid;
  flex: 1;
  gap: var(--space-1);
  min-width: 0;
}

.switch-row__label {
  font: var(--text-ui);
}

.switch-row__hint {
  color: var(--text-muted);
  font: var(--text-caption);
}

/* The track and the knob; the knob slides on. */
.switch {
  position: relative;
  flex: none;
  width: 40px;
  height: 24px;
  margin: 0;
  border-radius: var(--radius-full);
  background: var(--border-strong);
  appearance: none;
  cursor: inherit;
  transition: background var(--duration-fast) var(--ease-standard);
}

.switch::after {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--surface);
  box-shadow: var(--shadow-segment);
  content: '';
  transition: transform var(--duration-fast) var(--ease-standard);
}

.switch:checked {
  background: var(--accent);
}

.switch:checked::after {
  transform: translateX(16px);
}

.switch:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
