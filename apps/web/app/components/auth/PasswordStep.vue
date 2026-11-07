<script setup lang="ts">
import Button from '../ui/Button.vue'
import Field from '../ui/Field.vue'
import Input from '../ui/Input.vue'

const password = defineModel<string>('password', { required: true })
defineProps<{ loading: boolean; hint?: string | null }>()
const emit = defineEmits<{ submit: [] }>()
const { t } = useI18n()
</script>

<template>
  <form class="auth-form" @submit.prevent="emit('submit')">
    <Field :label="t('login.passwordLabel')" :hint="hint ? t('login.passwordHint', { hint }) : t('login.passwordHelp')">
      <Input
        v-model="password"
        size="lg"
        revealable
        :placeholder="t('login.passwordPlaceholder')"
        name="current-password"
        autocomplete="current-password"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
      />
    </Field>
    <Button type="submit" variant="primary" size="lg" :loading="loading" block>
      {{ loading ? t('login.signingIn') : t('login.signIn') }}
    </Button>
  </form>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
</style>
