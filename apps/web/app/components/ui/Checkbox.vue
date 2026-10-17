<script setup lang="ts">
import { Check } from '../../lib/icons'

/**
 * Checkbox, or radio with `type="radio"`: a visually hidden native input and a
 * drawn 20px box. The whole row is clickable. Group several in a <fieldset>
 * with a <legend>.
 */
const props = withDefaults(
  defineProps<{
    type?: 'checkbox' | 'radio'
    /** Radio only: the value this option sets. */
    value?: string
    name?: string
    hint?: string
    disabled?: boolean
  }>(),
  { type: 'checkbox', value: '', name: undefined, hint: '', disabled: false },
)

const model = defineModel<boolean | string>()
const hintId = useId()

const checked = computed(() => (props.type === 'radio' ? model.value === props.value : Boolean(model.value)))

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  model.value = props.type === 'radio' ? props.value : input.checked
}
</script>

<template>
  <label class="check" :class="{ 'check--radio': type === 'radio', 'check--disabled': disabled }">
    <input
      class="check__input"
      :type="type"
      :name="name"
      :value="type === 'radio' ? value : undefined"
      :checked="checked"
      :disabled="disabled"
      :aria-describedby="hint ? hintId : undefined"
      @change="onChange"
    />
    <span class="check__box" aria-hidden="true">
      <span v-if="type === 'radio'" class="check__dot" />
      <Check v-else class="check__mark" />
    </span>
    <span class="check__text">
      <span><slot /></span>
      <span v-if="hint" :id="hintId" class="check__hint">{{ hint }}</span>
    </span>
  </label>
</template>

<style scoped>
.check {
  position: relative;
  display: inline-flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-height: 24px;
  color: var(--text);
  cursor: pointer;
  font: var(--text-ui);
  font-weight: 400;
}

.check--disabled {
  cursor: not-allowed;
}

.check__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.check__box {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--control-border);
  border-radius: var(--radius-xs);
  background: var(--surface);
  color: var(--on-accent);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.check--radio .check__box {
  border-radius: 50%;
}

.check__mark {
  --icon-size: 14px;
  stroke-width: 2.5;
}

.check__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--on-accent);
}

.check__mark,
.check__dot {
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.check__input:checked + .check__box {
  border-color: var(--accent);
  background: var(--accent);
}

.check__input:checked + .check__box > * {
  opacity: 1;
  transform: none;
}

.check__input:focus-visible + .check__box {
  box-shadow: var(--focus-ring);
}

@media (hover: hover) {
  .check:hover .check__input:not(:checked):not(:disabled) + .check__box {
    border-color: var(--text);
  }
}

.check__input:disabled + .check__box,
.check__input:disabled ~ .check__text {
  opacity: var(--opacity-disabled);
}

.check__text {
  display: grid;
  gap: 2px;
}

.check__hint {
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
