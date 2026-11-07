<script setup lang="ts">
import type { Component, StyleValue } from 'vue'
import { Eye, EyeOff, X } from '../../lib/icons'
import { fieldKey } from './Field.vue'

/**
 * A text field: the global `.input` box with an `.input__control` inside, so it can carry a leading
 * icon or add-on (the country code), a clear button and a password reveal. Grey at rest, white with
 * an ink outline on focus, pink when invalid. Inside UiField it takes the field's id, description
 * and invalid state.
 *
 * `class` and `style` go to the box; every other attribute (type, name, autocomplete, inputmode,
 * placeholder, listeners) goes to the <input>. `inputClass` puts classes on the <input> itself.
 *
 * The value is controlled: if the parent rewrites what was typed (formatting a phone number), the
 * field shows the parent's value even when it did not change.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** md 44 · lg 48. */
    size?: 'md' | 'lg'
    icon?: Component | null
    /** A leading add-on in the `leading` slot (a UiSelect with variant="addon"); drops the left padding. */
    addon?: boolean
    clearable?: boolean
    /** A password field with a show / hide button. */
    revealable?: boolean
    invalid?: boolean
    disabled?: boolean
    /** White instead of grey, for a field placed straight on the page background. */
    raised?: boolean
    inputClass?: string | string[] | Record<string, boolean>
    id?: string
  }>(),
  {
    size: 'md',
    icon: null,
    addon: false,
    clearable: false,
    revealable: false,
    invalid: false,
    disabled: false,
    raised: false,
    inputClass: undefined,
    id: undefined,
  },
)

const model = defineModel<string>({ default: '' })
const attrs = useAttrs()
const { t } = useI18n()
const field = inject(fieldKey, null)
const inputRef = ref<HTMLInputElement | null>(null)
const revealed = ref(false)

const controlId = computed(() => props.id ?? field?.id.value)
const isInvalid = computed(() => props.invalid || Boolean(field?.invalid.value))
const controlAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style')),
)
const type = computed(() => {
  if (props.revealable) return revealed.value ? 'text' : 'password'
  return (attrs.type as string | undefined) ?? 'text'
})

async function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  model.value = target.value
  await nextTick()
  if (target.value !== model.value) target.value = model.value
}

function clear() {
  model.value = ''
  inputRef.value?.focus()
}

defineExpose({ focus: () => inputRef.value?.focus(), el: inputRef })
</script>

<template>
  <div
    class="input ui-input"
    :class="[
      attrs.class,
      {
        'input--lg': size === 'lg',
        'input--addon': addon,
        'input--raised': raised,
        'ui-input--invalid': isInvalid,
        'ui-input--disabled': disabled,
      },
    ]"
    :style="attrs.style as StyleValue"
  >
    <slot name="leading">
      <component :is="icon" v-if="icon" class="ui-input__icon" aria-hidden="true" />
    </slot>
    <input
      v-bind="controlAttrs"
      :id="controlId"
      ref="inputRef"
      :value="model"
      :type="type"
      class="input__control"
      :class="inputClass"
      :disabled="disabled"
      :aria-invalid="isInvalid || undefined"
      :aria-describedby="field?.describedby.value"
      @input="onInput"
    />
    <button
      v-if="clearable && model && !disabled"
      type="button"
      class="input__clear"
      :aria-label="t('common.clear')"
      @click="clear"
    >
      <X aria-hidden="true" />
    </button>
    <button
      v-if="revealable"
      type="button"
      class="input__clear"
      :aria-label="revealed ? t('common.hidePassword') : t('common.showPassword')"
      :aria-pressed="revealed"
      :disabled="disabled"
      @click="revealed = !revealed"
    >
      <component :is="revealed ? EyeOff : Eye" aria-hidden="true" />
    </button>
    <slot name="trailing" />
  </div>
</template>

<style scoped>
.ui-input__icon {
  color: var(--text-muted);
}

.ui-input--invalid {
  background: var(--danger-subtle);
}

.ui-input--invalid:focus-within {
  background: var(--surface);
  box-shadow: var(--focus-ring-field-danger);
}

.ui-input--disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

.ui-input--disabled .input__control {
  cursor: not-allowed;
}
</style>
