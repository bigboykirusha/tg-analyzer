<script setup lang="ts">
/**
 * On/off setting that applies at once, without a «Save» button. The label
 * describes the on state («Уведомлять…»). For changes that need confirming use
 * Checkbox.
 */
withDefaults(defineProps<{ hint?: string; disabled?: boolean }>(), { hint: '', disabled: false })

const model = defineModel<boolean>({ default: false })
const hintId = useId()
</script>

<template>
  <label class="switch" :class="{ 'switch--disabled': disabled }">
    <span class="switch__text">
      <span class="switch__label"><slot /></span>
      <span v-if="hint" :id="hintId" class="switch__hint">{{ hint }}</span>
    </span>
    <input
      v-model="model"
      class="switch__input"
      type="checkbox"
      role="switch"
      :aria-checked="model"
      :disabled="disabled"
      :aria-describedby="hint ? hintId : undefined"
    />
    <span class="switch__track" aria-hidden="true" />
  </label>
</template>

<style scoped>
.switch {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: var(--control-md);
  color: var(--text);
  cursor: pointer;
}

.switch--disabled {
  cursor: not-allowed;
}

.switch__text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.switch__label {
  font: var(--text-ui);
}

.switch__hint {
  color: var(--text-muted);
  font: var(--text-small);
}

.switch__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.switch__track {
  position: relative;
  flex: 0 0 auto;
  width: 44px;
  height: 26px;
  border-radius: var(--radius-full);
  background: var(--control-border);
  transition: background-color var(--transition-normal);
}

.switch__track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--switch-thumb);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-normal);
}

.switch__input:checked + .switch__track {
  background: var(--accent);
}

.switch__input:checked + .switch__track::after {
  transform: translateX(18px);
}

.switch__input:focus-visible + .switch__track {
  box-shadow: var(--focus-ring);
}

.switch__input:disabled ~ * {
  opacity: var(--opacity-disabled);
}

.switch--disabled .switch__text {
  opacity: var(--opacity-disabled);
}
</style>
