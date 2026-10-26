<script setup lang="ts">
import type { Component } from 'vue'
import Button from './Button.vue'

/**
 * Confirmation: a question as the title, consequences as the description and
 * a concrete verb on the main button. `danger` makes that button soft red and
 * the role `alertdialog`; focus starts on the dialog itself. The `subject`
 * slot names what is acted on (a chat), the default slot lists what is lost.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    cancelLabel?: string
    variant?: 'default' | 'danger'
    confirmIcon?: Component | null
    loading?: boolean
  }>(),
  {
    cancelLabel: '',
    variant: 'default',
    confirmIcon: null,
    loading: false,
  },
)

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const { t } = useI18n()
const isDanger = computed(() => props.variant === 'danger')
</script>

<template>
  <UiModalDialog
    :open="open"
    :title="title"
    :description="description"
    :close-label="t('common.close')"
    :busy="loading"
    :role="isDanger ? 'alertdialog' : 'dialog'"
    size="sm"
    @close="emit('close')"
  >
    <template v-if="$slots.subject" #top>
      <slot name="subject" />
    </template>
    <template v-if="$slots.default" #default>
      <slot />
    </template>
    <template #actions>
      <Button variant="secondary" :disabled="loading" @click="emit('close')">
        {{ cancelLabel || t('common.cancel') }}
      </Button>
      <Button
        :variant="isDanger ? 'danger' : 'primary'"
        :icon="confirmIcon"
        :loading="loading"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </Button>
    </template>
  </UiModalDialog>
</template>
