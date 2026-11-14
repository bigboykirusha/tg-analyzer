<script setup lang="ts">
import Button from '../ui/Button.vue'
import Field from '../ui/Field.vue'
import Input from '../ui/Input.vue'

const password = defineModel<string>('password', { required: true })
defineProps<{ loading: boolean; hint?: string | null; error?: string }>()
const emit = defineEmits<{ submit: [] }>()
const { t } = useI18n()
</script>

<template>
  <form class="auth-form" @submit.prevent="emit('submit')">
    <Field
      :label="t('login.passwordLabel')"
      :error="error ? (hint ? `${error} ${t('login.passwordHint', { hint })}` : error) : null"
      :hint="hint ? t('login.passwordHint', { hint }) : ''"
    >
      <Input
        v-model="password"
        revealable
        :placeholder="t('login.passwordPlaceholder')"
        name="current-password"
        autocomplete="current-password"
        enterkeyhint="done"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
      />
    </Field>
    <Button type="submit" variant="primary" size="lg" :loading="loading" :disabled="!password" block>
      {{ t('login.signIn') }}
    </Button>
  </form>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Left, like every line of the step above it. */
</style>
