<script setup lang="ts">
import Button from './Button.vue'
import ModalDialog from './ModalDialog.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    cancelLabel: string
    variant?: 'default' | 'danger'
    loading?: boolean
  }>(),
  {
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
  <ModalDialog
    :open="open"
    :title="title"
    :description="description"
    :close-label="t('common.close')"
    :busy="loading"
    size="sm"
    @close="emit('close')"
  >
    <template #actions>
      <Button variant="secondary" :disabled="loading" @click="emit('close')">
        {{ cancelLabel }}
      </Button>
      <Button :variant="variant === 'danger' ? 'danger' : 'primary'" :loading="loading" @click="emit('confirm')">
        {{ confirmLabel }}
      </Button>
    </template>
  </ModalDialog>
</template>
