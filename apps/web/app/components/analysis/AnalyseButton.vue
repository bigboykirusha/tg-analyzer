<script setup lang="ts">
import { X } from '../../lib/icons'

/**
 * «Разобрать» for one chat, wherever a chat is offered (the newcomer's home, «Новый анализ», a chat's page
 * without a report): one button that tells the same state everywhere, in its own place.
 *   idle      «Разобрать»
 *   starting  the same label, busy
 *   reading   the percentage (or «Разбираем…» before the first number) beside a spinner; pressing it opens
 *             «Разбираем переписку» — how far it got, and where it can be cancelled
 *   queued    «В очереди» with a cross: pressing it takes the chat out of the line
 * The state changes the words, never the look: the button keeps the variant its place gave it.
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
const { t, formatNumber } = useI18n()
const actions = useReportActions()
const analysis = useAnalysis()
const view = useAnalysisView()

const queuedJob = computed(() => analysis.queued.value.find((item) => item.chatId === props.chatId)?.jobId ?? null)
const reading = computed(() => analysis.isActive.value && analysis.progress.value.chatId === props.chatId)
const percent = computed(() => view.value?.percent ?? null)
</script>

<template>
  <UiButton
    v-if="queuedJob"
    :variant="variant === 'primary' ? 'secondary' : variant"
    :size="size"
    :block="block"
    :icon="X"
    :aria-label="t('analysis.cancelQueued', { name: title })"
    @click.prevent="analysis.cancel(queuedJob)"
  >
    {{ t('dashboard.queued') }}
  </UiButton>
  <UiButton
    v-else-if="reading"
    :variant="variant === 'primary' ? 'secondary' : variant"
    :size="size"
    :block="block"
    aria-haspopup="dialog"
    :aria-label="t('home.moreReading', { name: title, percent: percent === null ? '…' : formatNumber(percent) })"
    @click.prevent="analysis.details.value = true"
  >
    <template #icon><span class="spinner" aria-hidden="true" /></template>
    <span class="analyse-button__label">{{ percent === null ? t('dashboard.analysingNow') : `${percent}%` }}</span>
  </UiButton>
  <UiButton
    v-else
    :variant="variant"
    :size="size"
    :block="block"
    :loading="actions.starting.value === chatId"
    :aria-label="t('home.unanalysedAction', { name: title })"
    @click.prevent="actions.analyse(chatId, title)"
  >
    <span class="analyse-button__label">{{ t('month.analyse') }}</span>
  </UiButton>
</template>

<style scoped>
/* The percentage changes every second: its digits keep their width, so the button does not twitch. */
.analyse-button__label {
  min-width: 4ch;
}
</style>
