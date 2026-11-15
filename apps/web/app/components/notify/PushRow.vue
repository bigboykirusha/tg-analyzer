<script setup lang="ts">
import { Bell } from '../../lib/icons'

/**
 * This device's web push, as one settings row (a bell, the label, a short line, a button): on «Уведомления», in the
 * account and in the running analysis. The button is the real state: «Включить», or «Выключить» once subscribed here. Where it cannot be turned
 * on (an old browser, an iPhone outside the Home Screen, refused in the browser) there is no button, and the line
 * says why. Nothing where the server has no push.
 */
const props = withDefaults(
  defineProps<{
    title?: string
    text?: string
    /** The offer inside the analysis sheet: shown only while it can be turned on, with no advice about settings. */
    offerOnly?: boolean
  }>(),
  { title: '', text: '', offerOnly: false },
)
const { t } = useI18n()
const toast = useToast()
const { state, busy, enable, disable } = usePush()

/** In the offer, the row stays once it was shown, so the switch does not vanish under the finger. */
const offered = ref(false)
watchEffect(() => {
  if (state.value === 'off') offered.value = true
})
const shown = computed(() => (props.offerOnly ? offered.value : state.value !== 'hidden'))

const blocked = computed(() => ['install', 'safari', 'denied', 'unsupported'].includes(state.value))
async function toggle() {
  try {
    await (state.value === 'on' ? disable() : enable())
  } catch {
    toast.error(t('push.error'))
  }
}
const subtitle = computed(() => {
  if (state.value === 'install') return t('push.installText')
  if (state.value === 'safari') return t('push.safariText')
  if (state.value === 'denied') return t('push.deniedText')
  if (state.value === 'unsupported') return t('push.unsupportedText')
  return props.text || t('push.offText')
})
</script>

<template>
  <UiGroup v-if="shown">
    <UiListRow :title="title || t('push.title')" :subtitle="subtitle">
      <template #leading><Bell aria-hidden="true" /></template>
      <template v-if="!blocked" #trailing>
        <UiButton variant="quiet" size="sm" :loading="busy" @click="toggle">
          {{ state === 'on' ? t('push.turnOff') : t('push.turnOn') }}
        </UiButton>
      </template>
    </UiListRow>
  </UiGroup>
</template>
