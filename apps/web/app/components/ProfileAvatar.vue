<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string | null | undefined
  size?: 'sm' | 'md'
}>(), {
  size: 'md',
})

const auth = useAuthStore()
const config = useRuntimeConfig()

const avatarUrl = ref<string | null>(null)
const errored = ref(false)

const sizeClass = computed(() => props.size === 'sm' ? 'avatar-sm' : 'avatar-md')
const initials = computed(() => {
  return props.title
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'TG'
})

async function loadAvatar() {
  if (!import.meta.client || !auth.accessToken || auth.telegramSessionActive === false) {
    avatarUrl.value = null
    return
  }

  if (avatarUrl.value) {
    URL.revokeObjectURL(avatarUrl.value)
    avatarUrl.value = null
  }

  try {
    const blob = await $fetch<Blob>(`${config.public.apiUrl}/api/auth/avatar`, {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
      responseType: 'blob',
    })
    avatarUrl.value = URL.createObjectURL(blob)
    errored.value = false
  } catch {
    avatarUrl.value = null
    errored.value = true
  }
}

watch(() => [auth.accessToken, auth.telegramSessionActive, props.title], () => {
  errored.value = false
  void loadAvatar()
}, { immediate: true })

onBeforeUnmount(() => {
  if (avatarUrl.value) {
    URL.revokeObjectURL(avatarUrl.value)
  }
})
</script>

<template>
  <div class="avatar-shell" :class="sizeClass">
    <img
      v-if="avatarUrl && !errored"
      :src="avatarUrl"
      :alt="title || 'Profile avatar'"
      class="avatar-image"
      @error="errored = true"
    >
    <span v-else>{{ initials }}</span>
  </div>
</template>

<style scoped>
.avatar-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
  background:
    radial-gradient(circle at 30% 30%, var(--accent-muted-hover), transparent 60%),
    var(--bg-elevated);
  color: var(--text-primary);
  font-weight: 600;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-sm {
  width: 32px;
  height: 32px;
  font-size: 12px;
}

.avatar-md {
  width: 36px;
  height: 36px;
  font-size: 12px;
}
</style>
