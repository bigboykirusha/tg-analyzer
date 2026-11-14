<script setup lang="ts">
import { Bell } from '../../lib/icons'

/**
 * The offer of web push where it is wanted: on top of «Уведомления» and in the running analysis («Сообщить, когда
 * будет готов»). «Включить» while it can be turned on; on an iPhone outside the installed app — how to install it;
 * refused in the browser — where it can be allowed again. Nothing once it is on, or where the server has no push.
 * The account holds the switch itself.
 */
const props = withDefaults(
  defineProps<{
    title?: string
    text?: string
    /** Only the offer itself (the analysis sheet): no install or settings advice there. */
    offerOnly?: boolean
  }>(),
  { title: '', text: '', offerOnly: false },
)
const { t } = useI18n()
const toast = useToast()
const { state, busy, enable } = usePush()

const shown = computed(() =>
  props.offerOnly
    ? state.value === 'off'
    : state.value === 'off' || state.value === 'install' || state.value === 'denied',
)
const subtitle = computed(() => {
  if (state.value === 'install') return t('push.installText')
  if (state.value === 'denied') return t('push.deniedText')
  return props.text || t('push.offText')
})

async function turnOn() {
  try {
    await enable()
  } catch {
    toast.error(t('push.error'))
  }
}
</script>

<template>
  <UiGroup v-if="shown">
    <UiListRow
      :title="state === 'install' ? t('push.installTitle') : title || t('push.title')"
      :subtitle="subtitle"
      wrap
    >
      <template #leading><Bell aria-hidden="true" /></template>
      <template v-if="state === 'off'" #trailing>
        <UiButton variant="quiet" size="sm" :loading="busy" @click="turnOn">{{ t('push.turnOn') }}</UiButton>
      </template>
    </UiListRow>
  </UiGroup>
</template>
