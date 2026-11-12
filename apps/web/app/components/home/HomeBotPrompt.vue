<script setup lang="ts">
import { Bell, X } from '../../lib/icons'

/**
 * After the first report: one quiet card on home offering the bot — «the next report arrives in Telegram». Shown
 * while the bot is set up and not yet on; «Подключить» opens the bot's Start, the cross hides the card for good
 * (this browser). Nothing is turned on from here: Start in the bot is the consent.
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
    // Private mode: the card stays hidden for this visit only.
  }
}

const shown = computed(
  () => !dismissed.value && Boolean(auth.user?.botUrl) && !auth.user?.botNotify && workspace.reports.length > 0,
)
</script>

<template>
  <aside v-if="shown" class="bot-prompt" :aria-label="t('home.botTitle')">
    <span class="bot-prompt__icon" aria-hidden="true"><Bell /></span>
    <div class="bot-prompt__copy">
      <p class="t-body bot-prompt__title">{{ t('home.botTitle') }}</p>
      <p class="t-label bot-prompt__text">{{ t('home.botText') }}</p>
    </div>
    <UiButton class="bot-prompt__go" :to="auth.user!.botUrl!" size="sm" target="_blank" rel="noopener" @click="dismiss">
      {{ t('home.botConnect') }}
    </UiButton>
    <UiIconButton class="bot-prompt__close" :icon="X" size="sm" :label="t('common.close')" @click="dismiss" />
  </aside>
</template>

<style scoped>
/* A white card with a hairline, the bell in the place of an avatar: an offer, not a report. */
.bot-prompt {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--ring-card);
}

.bot-prompt__icon {
  display: grid;
  place-items: center;
  width: var(--avatar-md);
  height: var(--avatar-md);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  --icon-size: var(--icon-md);
}

.bot-prompt__copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
  min-width: 0;
}

.bot-prompt__title {
  font-weight: 500;
}

.bot-prompt__text {
  color: var(--text-muted);
}

/* A phone: the button goes under the words, the cross stays in the corner. */
@media (max-width: 640px) {
  .bot-prompt {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'icon copy close'
      '. go go';
  }

  .bot-prompt__icon {
    grid-area: icon;
    align-self: start;
  }

  .bot-prompt__copy {
    grid-area: copy;
  }

  .bot-prompt__close {
    grid-area: close;
    align-self: start;
  }

  .bot-prompt__go {
    grid-area: go;
    justify-self: start;
  }
}
</style>
