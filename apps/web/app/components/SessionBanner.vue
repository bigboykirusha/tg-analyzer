<script setup lang="ts">
import { AlertTriangle } from '../lib/icons'

/** Shown when the Telegram session has ended: analyses need a fresh sign-in. */
const { t } = useI18n()
const auth = useAuthStore()
const { logout } = useAuth()
</script>

<template>
  <div v-if="!auth.telegramSessionActive" class="banner banner--warning" role="status">
    <AlertTriangle aria-hidden="true" />
    <div class="banner__copy">
      <span class="banner__title">{{ t('dashboard.sessionInactive') }}</span>
    </div>
    <div class="banner__actions">
      <UiButton variant="secondary" size="sm" @click="logout">{{ t('common.relogin') }}</UiButton>
    </div>
  </div>
</template>
