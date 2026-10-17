<script setup lang="ts">
import { api } from '../composables/useApi'

withDefaults(defineProps<{ title: string | null | undefined; size?: 'sm' | 'md' }>(), { size: 'sm' })

// One request per page load; the photo rarely changes.
let request: Promise<string | null> | null = null

const auth = useAuthStore()
const src = ref<string | null>(null)

onMounted(async () => {
  if (!auth.telegramSessionActive) return
  request ??= api('GET /api/v1/auth/avatar')
    .then((blob) => URL.createObjectURL(blob))
    .catch(() => null)
  src.value = await request
})
</script>

<template>
  <UiAvatar :title="title" :src="src" :size="size" :seed="auth.user?.id ?? title" />
</template>
