<script setup lang="ts">
import { hueOf } from '../../lib/hue'

/**
 * The running analysis, unfolded: a card in the chat's colour (avatar, name, how far back the reading got,
 * the percentage and the pulse read so far — drawn from today back, dots for what is ahead, as the growing tile on
 * home), how much is read, the offer of a push when it is ready, cancel. The card keeps one height while it reads:
 * every line is always there, one line each.
 * A dialog on desktop, a sheet on a phone (UiModalDialog does both).
 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const view = useAnalysisView()
const analysis = useAnalysis()
const toast = useToast()
const confirming = ref(false)
const cancelling = ref(false)

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
            <!-- How far back the reading got; while connecting, waiting for Telegram or assembling — that instead. -->
            <span class="details-card__reached">{{ view.reached || view.status }}</span>
          </span>
          <span v-if="view.percent !== null" class="details-card__percent">{{ view.percent }}%</span>
        </div>
        <Pulse
          class="details-card__pulse"
          :data="view.pulse"
          :height="0"
          :bars="64"
          :pitch="6"
          :read="view.share"
          :label="t('analysis.progressLabel')"
        />
        <!-- Always there, one line: the card must not jump as the count grows or first appears. -->
        <p class="details-card__note">
          <template v-if="view.read">{{ view.read }}</template
          ><template v-else>&nbsp;</template>
        </p>
      </section>
      <PushRow :title="t('analysis.details.notify')" :text="t('analysis.details.notifyHint')" offer-only />
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
/* The chat's poster in miniature: its colour, ink type, the pulse in its two inks. */
.details-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--card-padding);
  border-radius: var(--radius-card);
  background-color: var(--poster);
  background-image: var(--poster-image);
  color: var(--on-poster);
  --pulse-half: var(--space-6);
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  --pulse-ahead: var(--on-poster-faint);
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

.details-card__name,
.details-card__reached,
.details-card__note {
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
</style>
