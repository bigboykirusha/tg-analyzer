<script setup lang="ts">
import { Bell } from '../../lib/icons'

/**
 * This device's web push, as one settings row (a bell on a grey disc, the label, a short line, the control): on
 * «Уведомления» and in the running analysis it is its own group with a button («Включить», or «Выключить» once
 * subscribed here); in the account (`variant="switch"`) it is a bare row with a switch, to sit in the group of
 * notifications. Where it cannot be turned on (an old browser, an iPhone outside the Home Screen, refused in the
 * browser) there is no button and the switch is off and dimmed, and the line says why. Nothing where the server has
 * no push; `hide-on` also hides it while push is already on here.
 */
const props = withDefaults(
  defineProps<{
    title?: string
    text?: string
    /** The offer inside the analysis sheet: shown only while it can be turned on, with no advice about settings. */
    offerOnly?: boolean
    /** `button` is a group of its own with «Включить»; `switch` is a row of the caller's group. */
    variant?: 'button' | 'switch'
    /** Nothing once push is on here: «Уведомления» offers it, it does not report it. */
    hideOn?: boolean
  }>(),
  { title: '', text: '', offerOnly: false, variant: 'button', hideOn: false },
)
const { t } = useI18n()
const toast = useToast()
const { state, busy, enable, disable } = usePush()

/** In the offer, the row stays once it was shown, so the switch does not vanish under the finger. */
const offered = ref(false)
watchEffect(() => {
  if (state.value === 'off') offered.value = true
})
const shown = computed(() => {
  if (props.offerOnly) return offered.value
  return state.value !== 'hidden' && !(props.hideOn && state.value === 'on')
})

const blocked = computed(() => ['install', 'safari', 'denied', 'unsupported'].includes(state.value))
async function toggle() {
  const turningOff = state.value === 'on'
  try {
    await (turningOff ? disable() : enable())
  } catch {
    toast.error(t(turningOff ? 'push.errorOff' : 'push.error'))
  }
}
const checked = computed({
  get: () => state.value === 'on',
  set: () => void toggle(),
})
const subtitle = computed(() => {
  if (state.value === 'install') return t('push.installText')
  if (state.value === 'safari') return t('push.safariText')
  if (state.value === 'denied') return t('push.deniedText')
  if (state.value === 'unsupported') return t('push.unsupportedText')
  return props.text || t('push.offText')
})
</script>

<template>
  <template v-if="shown">
    <UiSwitch
      v-if="variant === 'switch'"
      v-model="checked"
      :label="title || t('push.title')"
      :hint="subtitle"
      :disabled="blocked || busy"
    >
      <template #leading
        ><UiIconDisc><Bell /></UiIconDisc
      ></template>
    </UiSwitch>
    <UiGroup v-else>
      <UiListRow :title="title || t('push.title')" :subtitle="subtitle">
        <template #leading
          ><UiIconDisc><Bell /></UiIconDisc
        ></template>
        <template v-if="!blocked" #trailing>
          <UiButton variant="quiet" size="sm" :loading="busy" @click="toggle">
            {{ state === 'on' ? t('push.turnOff') : t('push.turnOn') }}
          </UiButton>
        </template>
      </UiListRow>
    </UiGroup>
  </template>
</template>
