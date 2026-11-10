<script lang="ts">
import type { InjectionKey, Ref } from 'vue'

/** What a field tells the control inside it (UiInput, UiOtpInput): its id, descriptions, state. */
export interface FieldContext {
  id: Ref<string>
  labelId: Ref<string>
  describedby: Ref<string | undefined>
  invalid: Ref<boolean>
}

export const fieldKey: InjectionKey<FieldContext> = Symbol('ui-field')
</script>

<script setup lang="ts">
import { AlertCircle } from '../../lib/icons'

/**
 * A label, one control, and one line under it: the hint, or the error in its place. The control
 * (UiInput, UiOtpInput, UiSelect) picks up the id, aria-describedby and the invalid state on its
 * own; a plain control can take them from the slot props instead.
 *
 * `group` is for a control made of several inputs (the code cells): the label names the group
 * instead of pointing at one input.
 */
const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    /** Replaces the hint and marks the control invalid. */
    error?: string | null
    /** Id of the control; generated when omitted. */
    id?: string
    group?: boolean
    /** The label is read aloud but not shown (the code cells: the title above says it). */
    hideLabel?: boolean
  }>(),
  { label: '', hint: '', error: null, id: undefined, group: false, hideLabel: false },
)

const slots = useSlots()
const generated = useId()
const controlId = computed(() => props.id ?? generated)
const labelId = computed(() => `${controlId.value}-label`)
const messageId = computed(() => `${controlId.value}-message`)
const hasMessage = computed(() => Boolean(props.error || props.hint || slots.hint))
const describedby = computed(() => (hasMessage.value ? messageId.value : undefined))
const invalid = computed(() => Boolean(props.error))

provide(fieldKey, { id: controlId, labelId, describedby, invalid })
</script>

<template>
  <div class="field ui-field" :class="{ 'ui-field--invalid': invalid }">
    <span v-if="label && group" :id="labelId" class="field__label" :class="{ 'sr-only': hideLabel }">{{ label }}</span>
    <label v-else-if="label" :id="labelId" class="field__label" :class="{ 'sr-only': hideLabel }" :for="controlId">{{
      label
    }}</label>
    <slot :id="controlId" :label-id="labelId" :describedby="describedby" :invalid="invalid" />
    <p v-if="error" :id="messageId" class="field__hint ui-field__error" role="alert">
      <AlertCircle class="ui-field__icon" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>
    <p v-else-if="hint || $slots.hint" :id="messageId" class="field__hint">
      <slot name="hint">{{ hint }}</slot>
    </p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.field__label {
  font: var(--text-label);
}

.field__hint {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-label);
}

.ui-field__error {
  color: var(--danger);
}

/* The 16 px icon sits on the first line of 20 px text. */
.ui-field__icon {
  --icon-size: var(--icon-sm);
  margin-top: var(--space-0-5);
}
</style>
