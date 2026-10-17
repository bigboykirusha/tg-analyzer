<script setup lang="ts">
import { Trash2 } from '../../lib/icons'
import Button from './Button.vue'

/**
 * Confirmation: a question as the title, consequences as the description and
 * a concrete verb on the main button. `danger` adds the Trash2 tile, a filled
 * danger button and `alertdialog`; focus starts on «Cancel».
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
const cancelRef = ref<InstanceType<typeof Button> | null>(null)
const isDanger = computed(() => props.variant === 'danger')

function cancelButton() {
  const el = cancelRef.value?.$el as HTMLElement | undefined
  return el instanceof HTMLElement ? el : null
}
</script>

<template>
  <UiModalDialog
    :open="open"
    :title="title"
    :description="description"
    :close-label="t('common.close')"
    :busy="loading"
    :role="isDanger ? 'alertdialog' : 'dialog'"
    :initial-focus="cancelButton"
    size="sm"
    @close="emit('close')"
  >
    <template v-if="isDanger" #media>
      <span class="icon-tile icon-tile--danger" aria-hidden="true"><Trash2 /></span>
    </template>
    <template #actions>
      <Button ref="cancelRef" variant="secondary" :disabled="loading" @click="emit('close')">
        {{ cancelLabel || t('common.cancel') }}
      </Button>
      <Button :variant="isDanger ? 'danger' : 'primary'" :loading="loading" @click="emit('confirm')">
        {{ confirmLabel }}
      </Button>
    </template>
  </UiModalDialog>
</template>
