<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string | null | undefined
    size?: 'sm' | 'md'
  }>(),
  {
    size: 'md',
  },
)

const auth = useAuthStore()

const PROFILE_AVATAR_TTL_MS = 60 * 60 * 1000
const PROFILE_AVATAR_UNAVAILABLE_KEY = 'tg-analyzer-profile-avatar-unavailable-until'
let cachedAvatar: { url: string; expiresAt: number } | null = null
let avatarRequest: Promise<string | null> | null = null
let avatarUnavailableUntil = 0

const avatarUrl = ref<string | null>(null)
const errored = ref(false)

const sizeClass = computed(() => (props.size === 'sm' ? 'avatar-sm' : 'avatar-md'))
const initials = computed(() => {
  return (
    props.title
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'TG'
  )
})

async function loadAvatar() {
  if (!import.meta.client || !auth.accessToken || auth.telegramSessionActive === false) {
    avatarUrl.value = null
    return
  }

  const now = Date.now()
  const storedUnavailableUntil = Number(sessionStorage.getItem(PROFILE_AVATAR_UNAVAILABLE_KEY) || 0)
  if (cachedAvatar && cachedAvatar.expiresAt <= now) {
    URL.revokeObjectURL(cachedAvatar.url)
    cachedAvatar = null
  }

  if (cachedAvatar) {
    avatarUrl.value = cachedAvatar.url
    errored.value = false
    return
  }

  if (Math.max(avatarUnavailableUntil, storedUnavailableUntil) > now) {
    avatarUrl.value = null
    errored.value = true
    return
  }

  try {
    avatarRequest ??= useApiBlobEndpoint('GET /api/v1/auth/avatar')
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        if (cachedAvatar) URL.revokeObjectURL(cachedAvatar.url)
        cachedAvatar = { url, expiresAt: Date.now() + PROFILE_AVATAR_TTL_MS }
        return url
      })
      .finally(() => {
        avatarRequest = null
      })
    avatarUrl.value = await avatarRequest
    errored.value = false
  } catch {
    avatarUnavailableUntil = Date.now() + PROFILE_AVATAR_TTL_MS
    sessionStorage.setItem(PROFILE_AVATAR_UNAVAILABLE_KEY, String(avatarUnavailableUntil))
    avatarUrl.value = null
    errored.value = true
  }
}

watch(
  () => [auth.accessToken, auth.telegramSessionActive, props.title],
  () => {
    errored.value = false
    void loadAvatar()
  },
  { immediate: true },
)
</script>

<template>
  <div class="avatar-shell" :class="sizeClass">
    <img
      v-if="avatarUrl && !errored"
      :src="avatarUrl"
      :alt="title || 'Profile avatar'"
      class="avatar-image"
      @error="errored = true"
    />
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
  background: radial-gradient(circle at 30% 30%, var(--accent-border), transparent 60%), var(--bg-elevated);
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
