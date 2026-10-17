<script setup lang="ts">
withDefaults(
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
</script>

<template>
  <UiModalDialog
    :open="open"
    :title="title"
    :description="description"
    :close-label="t('common.close')"
    :busy="loading"
    size="sm"
    @close="emit('close')"
  >
    <template #actions>
      <UiButton variant="secondary" :disabled="loading" @click="emit('close')">
        {{ cancelLabel || t('common.cancel') }}
      </UiButton>
      <UiButton :variant="variant === 'danger' ? 'danger' : 'primary'" :loading="loading" @click="emit('confirm')">
        {{ confirmLabel }}
      </UiButton>
    </template>
  </UiModalDialog>
</template>
