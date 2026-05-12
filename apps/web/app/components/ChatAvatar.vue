<script setup lang="ts">
const AVATAR_CACHE_TTL_MS = 60 * 60 * 1000
const AVATAR_CACHE_MAX_ENTRIES = 300
const avatarCache = new Map<string, { url: string; expiresAt: number }>()
const avatarRequests = new Map<string, Promise<string | null>>()

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

function pruneAvatarCache() {
  const now = Date.now()
  for (const [key, entry] of avatarCache.entries()) {
    if (entry.expiresAt <= now) {
      URL.revokeObjectURL(entry.url)
      avatarCache.delete(key)
    }
  }

  while (avatarCache.size > AVATAR_CACHE_MAX_ENTRIES) {
    const oldestKey = avatarCache.keys().next().value
    if (!oldestKey) {
      break
    }

    const entry = avatarCache.get(oldestKey)
    if (entry) {
      URL.revokeObjectURL(entry.url)
    }
    avatarCache.delete(oldestKey)
  }
}

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
  if (!import.meta.client || !props.hasAvatar || !auth.accessToken || !auth.user?.id) {
    avatarUrl.value = null
    return
  }

  pruneAvatarCache()
  const cacheKey = `${auth.user.id}:${props.chatId}`
  const cached = avatarCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    avatarUrl.value = cached.url
    errored.value = false
    return
  }

  try {
    let request = avatarRequests.get(cacheKey)
    if (!request) {
      request = $fetch<Blob>(`${config.public.apiUrl}/api/parse/dialogs/${props.chatId}/avatar`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
        responseType: 'blob',
      })
        .then((blob) => {
          const objectUrl = URL.createObjectURL(blob)
          avatarCache.set(cacheKey, {
            url: objectUrl,
            expiresAt: Date.now() + AVATAR_CACHE_TTL_MS,
          })
          pruneAvatarCache()
          return objectUrl
        })
        .finally(() => {
          avatarRequests.delete(cacheKey)
        })

      avatarRequests.set(cacheKey, request)
    }

    avatarUrl.value = await request
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
