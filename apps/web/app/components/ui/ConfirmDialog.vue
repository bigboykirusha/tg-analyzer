<script setup lang="ts">
import Button from './Button.vue'

/**
 * Confirmation: a question as the title, consequences as the description and
 * a concrete verb on the main button. `danger` keeps the ink button and sets
 * the role `alertdialog`; focus starts on the dialog itself. The default slot
 * lists what is lost.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
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
    <template v-if="$slots.default" #default>
      <slot />
    </template>
    <template #actions>
      <Button variant="secondary" :disabled="loading" @click="emit('close')">
        {{ t('common.cancel') }}
      </Button>
      <Button variant="primary" :loading="loading" @click="emit('confirm')">
        {{ confirmLabel }}
      </Button>
    </template>
  </UiModalDialog>
</template>
