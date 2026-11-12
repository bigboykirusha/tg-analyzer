<script setup lang="ts">
import { X } from '../../lib/icons'

/**
 * «Разобрать» for one chat, wherever a chat is offered (home, the newcomer's home, «Новый анализ»): one
 * button that tells the same state everywhere, in its own place: no second spinner beside the capsule's number.
 *   idle      «Разобрать»
 *   starting  the same label, busy
 *   reading   busy, the percentage the capsule and the sheet show (or «Разбираем…» before the first number)
 *   queued    «В очереди» with a cross: pressing it takes the chat out of the line
 */
const props = withDefaults(
  defineProps<{
    chatId: string
    title: string
    variant?: 'primary' | 'secondary' | 'quiet'
    size?: 'sm' | 'md'
    block?: boolean
  }>(),
  { variant: 'quiet', size: 'sm', block: false },
)
const { t } = useI18n()
const actions = useReportActions()
const analysis = useAnalysis()
const view = useAnalysisView()

const queuedJob = computed(() => analysis.queued.value.find((item) => item.chatId === props.chatId)?.jobId ?? null)
const reading = computed(() => analysis.isActive.value && analysis.progress.value.chatId === props.chatId)
const label = computed(() => {
  if (!reading.value) return t('month.analyse')
  const percent = view.value?.percent
  return percent === null || percent === undefined ? t('dashboard.analysingNow') : `${percent}%`
})
</script>

<template>
  <UiButton
    v-if="queuedJob"
    :size="size"
    :block="block"
    :icon="X"
    :aria-label="t('analysis.cancelQueued', { name: title })"
    @click.prevent="analysis.cancel(queuedJob)"
  >
    {{ t('dashboard.queued') }}
  </UiButton>
  <UiButton
    v-else
    :variant="variant"
    :size="size"
    :block="block"
    :loading="reading || actions.starting.value === chatId"
    :aria-label="reading ? undefined : t('home.unanalysedAction', { name: title })"
    @click.prevent="actions.analyse(chatId, title)"
  >
    <span class="analyse-button__label">{{ label }}</span>
  </UiButton>
</template>

<style scoped>
/* The percentage changes every second: its digits keep their width, so the button does not twitch. */
.analyse-button__label {
  min-width: 4ch;
}
</style>
