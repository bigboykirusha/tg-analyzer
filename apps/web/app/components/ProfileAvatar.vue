<script setup lang="ts">
import { loadProfileAvatar } from '../lib/avatar-loader'

withDefaults(defineProps<{ title: string | null | undefined; size?: 'sm' | 'md' | 'lg' }>(), { size: 'sm' })

const auth = useAuthStore()
const src = ref<string | null>(null)

onMounted(async () => {
  if (!auth.telegramSessionActive) return
  src.value = await loadProfileAvatar()
})
</script>

<template>
  <UiAvatar :title="title" :src="src" :size="size" :seed="auth.user?.id ?? title" />
</template>
