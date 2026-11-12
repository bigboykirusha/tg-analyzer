<script setup lang="ts">
import { Send } from '../../lib/icons'
import { hueOf } from '../../lib/hue'

/**
 * The running analysis, unfolded: a card in the chat's colour (avatar, name, how far back the reading got,
 * the percentage and a bar), how much is read and that the app may be closed, the Telegram nudge, cancel.
 * A dialog on desktop, a sheet on a phone (UiModalDialog does both).
 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const view = useAnalysisView()
const analysis = useAnalysis()
const auth = useAuthStore()
const toast = useToast()
const confirming = ref(false)
const cancelling = ref(false)
const botUrl = computed(() => (auth.user?.botUrl && !auth.user.botNotify ? auth.user.botUrl : null))

async function cancel() {
  cancelling.value = true
  try {
    await analysis.cancel()
    confirming.value = false
    emit('close')
  } catch {
    toast.error(t('analysis.cancelError'))
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <UiModalDialog :open="open && !!view" :title="t('analysis.details.title')" size="md" @close="emit('close')">
    <template v-if="view">
      <section class="details-card" :data-hue="view.chatId ? hueOf(view.chatId) : undefined">
        <div class="details-card__head">
          <ChatAvatar v-if="view.chatId" :chat-id="view.chatId" :title="view.chat" size="md" on-poster />
          <span class="details-card__copy">
            <strong class="details-card__name">{{ view.chat }}</strong>
            <span v-if="view.reached" class="details-card__reached">{{ view.reached }}</span>
          </span>
          <span v-if="view.percent !== null" class="details-card__percent">{{ view.percent }}%</span>
        </div>
        <div
          v-if="view.percent !== null"
          class="details-card__bar"
          role="progressbar"
          :aria-valuenow="view.percent"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="t('analysis.progressLabel')"
        >
          <i :style="{ transform: `scaleX(${view.percent / 100})` }" />
        </div>
        <p class="details-card__note">{{ view.read ? `${view.read}. ` : '' }}{{ t('analysis.banner.closeTab') }}</p>
      </section>
      <UiGroup v-if="botUrl">
        <UiListRow :title="t('analysis.details.notify')" :subtitle="t('analysis.details.notifyHint')">
          <template #leading><Send aria-hidden="true" /></template>
          <template #trailing>
            <UiButton :to="botUrl" variant="quiet" size="sm" target="_blank" rel="noopener">{{
              t('analysis.details.notifyOn')
            }}</UiButton>
          </template>
        </UiListRow>
      </UiGroup>
    </template>
    <template #actions>
      <UiButton variant="secondary" block @click="confirming = true">{{ t('analysis.cancel') }}</UiButton>
    </template>
  </UiModalDialog>
  <UiConfirmDialog
    :open="confirming"
    :title="t('analysis.cancelTitle')"
    :description="t('analysis.cancelText')"
    :confirm-label="t('analysis.cancel')"
    variant="danger"
    :loading="cancelling"
    @close="confirming = false"
    @confirm="cancel"
  />
</template>

<style scoped>
/* The chat's poster in miniature: its colour, ink type, the person's deep tone for the bar. */
.details-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--card-padding);
  border-radius: var(--radius-card);
  background-color: var(--poster);
  background-image: var(--poster-image);
  color: var(--on-poster);
}

.details-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.details-card__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.details-card__name {
  overflow: hidden;
  font: var(--text-body);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.details-card__reached,
.details-card__note {
  color: var(--on-poster-muted);
  font: var(--text-label);
}

.details-card__percent {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

.details-card__bar {
  height: var(--bar-height);
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--on-poster-chip);
}

.details-card__bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--on-them);
  transform-origin: left;
  transition: transform var(--duration-chart) var(--ease-standard);
}
</style>
