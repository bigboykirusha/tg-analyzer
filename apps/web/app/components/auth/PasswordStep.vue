<script setup lang="ts">
import Button from '../ui/Button.vue'

const password = defineModel<string>('password', { required: true })
defineProps<{ loading: boolean; hint?: string | null }>()
const emit = defineEmits<{ submit: [] }>()
const { t } = useI18n()
</script>

<template>
  <form class="auth-form" @submit.prevent="emit('submit')">
    <label class="field">
      <span class="field__label">{{ t('login.passwordLabel') }}</span>
      <input
        v-model="password"
        type="password"
        class="input input--lg"
        :placeholder="t('login.passwordPlaceholder')"
        name="current-password"
        autocomplete="current-password"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
      />
      <span class="field__hint">
        {{ hint ? t('login.passwordHint', { hint }) : t('login.passwordHelp') }}
      </span>
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
</style>
