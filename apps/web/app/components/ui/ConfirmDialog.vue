<script setup lang="ts">
import Button from './Button.vue'

/**
 * Confirmation: a question as the title, consequences as the description and
 * a concrete verb on the main button. `danger` adds a filled
 * danger button and `alertdialog`; focus starts on the dialog itself.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    cancelLabel?: string
    variant?: 'default' | 'danger'
    loading?: boolean
  }>(),
  {
    cancelLabel: '',
    variant: 'default',
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
    <template #actions>
      <Button variant="secondary" :disabled="loading" @click="emit('close')">
        {{ cancelLabel || t('common.cancel') }}
      </Button>
      <Button :variant="isDanger ? 'danger' : 'primary'" :loading="loading" @click="emit('confirm')">
        {{ confirmLabel }}
      </Button>
    </template>
  </UiModalDialog>
</template>
