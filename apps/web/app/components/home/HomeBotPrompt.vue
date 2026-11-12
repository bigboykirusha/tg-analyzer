<script setup lang="ts">
/**
 * Once, when the first report is ready: a sheet asking whether the next ones should arrive in Telegram — «Подключить
 * бота» opens the bot's Start (Start there is the consent), «Не сейчас» closes it for good in this browser. Shown
 * only while the bot is set up and not yet on; afterwards the offer lives at the top of «Уведомления» and as the
 * switch in the account.
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
  <UiModalDialog :open="open" :title="t('home.botTitle')" :description="t('home.botText')" @close="dismiss">
    <template #actions>
      <!-- The dialog stacks its actions bottom-up on a phone: listed «Не сейчас» first, it stands under the main one. -->
      <UiButton variant="link" block class="bot-later" @click="dismiss">{{ t('home.botLater') }}</UiButton>
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
    </template>
  </UiModalDialog>
</template>

<style scoped>
/* «Не сейчас» is a word under the main button, as «Пример отчёта» under «Войти через Telegram». */
.bot-later {
  min-height: var(--control-md);
  color: var(--text-muted);
  text-decoration: none;
}
</style>
