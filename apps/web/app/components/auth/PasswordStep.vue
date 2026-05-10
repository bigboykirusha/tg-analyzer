<script setup lang="ts">
import Button from '../ui/Button.vue'

const password = defineModel<string>('password', { required: true })
defineProps<{ loading: boolean }>()
const emit = defineEmits<{ submit: [] }>()
const { t } = useI18n()
</script>

<template>
  <form class="auth-form" @submit.prevent="emit('submit')">
    <label class="auth-field">
      <span class="text-label">{{ t('login.passwordLabel') }}</span>
      <input v-model="password" type="password" class="input" :placeholder="t('login.passwordPlaceholder')" autocomplete="current-password">
      <span class="text-caption">{{ t('login.passwordHelp') }}</span>
    </label>
    <Button variant="primary" size="lg" :loading="loading" block>
      {{ loading ? t('login.signingIn') : t('login.signIn') }}
    </Button>
  </form>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
