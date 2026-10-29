<script setup lang="ts">
import { loadChatAvatar } from '../lib/avatar-loader'
import type { AvatarSize } from './ui/Avatar.vue'

/**
 * `hasAvatar` comes from the chat list. Where it is unknown (reports, the
 * sidebar) the photo is asked for anyway: the server remembers chats without one.
 */
const props = withDefaults(
  defineProps<{ chatId: string; title: string | null | undefined; hasAvatar?: boolean | null; size?: AvatarSize }>(),
  { hasAvatar: null, size: 'md' },
)

const src = ref<string | null>(null)

watch(
  () => [props.chatId, props.hasAvatar] as const,
  async ([chatId, hasAvatar]) => {
    src.value = null
    if (!import.meta.client || hasAvatar === false) return
    const url = await loadChatAvatar(chatId)
    if (chatId === props.chatId) src.value = url
  },
  { immediate: true },
)
</script>

<template>
  <UiAvatar :title="title" :src="src" :size="size" :seed="chatId" />
</template>
