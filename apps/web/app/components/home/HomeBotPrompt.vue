<script setup lang="ts">
/**
 * Once, when the first report is ready: a sheet asking whether the next ones should arrive in Telegram — a question
 * set as a headline, one line of what the bot does, «Подключить бота» and «Не сейчас» right under it. «Подключить»
 * opens the bot's Start (Start there is the consent); either answer closes it for good in this browser. Shown only
 * while the bot is set up and not yet on; afterwards the offer lives at the top of «Уведомления» and in the account.
 */
const DISMISS_KEY = 'tg-analyzer:bot-prompt-dismissed'
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const { t } = useI18n()

const dismissed = ref(true)
onMounted(() => {
  try {
    dismissed.value = localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    dismissed.value = false
  }
})
function dismiss() {
  dismissed.value = true
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // Private mode: the sheet stays closed for this visit only.
  }
}

const open = computed(
  () => !dismissed.value && Boolean(auth.user?.botUrl) && !auth.user?.botNotify && workspace.reports.length > 0,
)
</script>

<template>
  <!-- A question, not a form: no close cross — «Не сейчас» is the way out (and Escape, and a swipe down). -->
  <UiModalDialog :open="open" role="alertdialog" :description="t('home.botText')" @close="dismiss">
    <template #header>
      <h2 class="bot-title">{{ t('home.botTitle') }}</h2>
    </template>
    <template #actions>
      <div class="bot-actions">
        <UiButton
          variant="primary"
          size="lg"
          block
          :to="auth.user?.botUrl ?? undefined"
          target="_blank"
          rel="noopener"
          @click="dismiss"
        >
          {{ t('home.botConnect') }}
        </UiButton>
        <UiButton variant="link" block class="bot-later" @click="dismiss">{{ t('home.botLater') }}</UiButton>
      </div>
    </template>
  </UiModalDialog>
</template>

<style scoped>
.bot-title {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  text-align: left;
  text-wrap: balance;
}

/* The main button and, close under it, the word that declines: one group, not two rows of the dialog's footer. */
.bot-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
  padding-top: var(--space-4);
}

.bot-actions .bot-later {
  min-height: var(--control-md);
  color: var(--text-muted);
  text-decoration: none;
}
</style>
