<script setup lang="ts">
const props = withDefaults(defineProps<{
  chatId: string
  title: string | null | undefined
  hasAvatar?: boolean
  size?: 'sm' | 'md' | 'lg'
}>(), {
  hasAvatar: true,
  size: 'md',
})

const errored = ref(false)
const avatarUrl = ref<string | null>(null)
const auth = useAuthStore()
const config = useRuntimeConfig()

const sizeClass = computed(() => {
  if (props.size === 'sm') {
    return 'avatar-sm'
  }
  if (props.size === 'lg') {
    return 'avatar-lg'
  }
  return 'avatar-md'
})

const initials = computed(() => {
  return props.title
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'
})

async function loadAvatar() {
  if (!import.meta.client || !props.hasAvatar || !auth.accessToken) {
    avatarUrl.value = null
    return
  }

  if (avatarUrl.value) {
    URL.revokeObjectURL(avatarUrl.value)
    avatarUrl.value = null
  }

  try {
    const blob = await $fetch<Blob>(`${config.public.apiUrl}/api/parse/dialogs/${props.chatId}/avatar`, {
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

watch(() => [props.chatId, props.hasAvatar, auth.accessToken], () => {
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
  <div
    class="avatar-shell"
    :class="sizeClass"
  >
    <img
      v-if="avatarUrl && !errored"
      :src="avatarUrl"
      :alt="title || 'Chat avatar'"
      class="h-full w-full object-cover"
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

.avatar-shell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-sm {
  width: 40px;
  height: 40px;
  font-size: 13px;
}

.avatar-md {
  width: 44px;
  height: 44px;
  font-size: 13px;
}

.avatar-lg {
  width: 64px;
  height: 64px;
  font-size: 18px;
}
</style>
