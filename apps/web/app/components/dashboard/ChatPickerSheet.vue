<script setup lang="ts">
/**
 * «Чаты Telegram» on a phone: the chat list as a sheet over the screen you are on, instead of a page of
 * its own, the people of the month over the list. It has its own URL (`?pick`), so the browser's back closes it;
 * `/new` stays for wide screens and direct links. It takes the whole screen (a list of hundreds of chats); on home it
 * grows out of its edge resting at the bottom (HomeChatsPeek) and settles back into it.
 */
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const open = computed(() => route.query.pick !== undefined)
const narrow = useMediaQuery('(max-width: 900px)')
const fromEdge = computed(() => narrow.value && route.path === '/dashboard')

function close() {
  // Opened from inside the app: step back; opened by a link: just drop the query.
  if (typeof window !== 'undefined' && typeof window.history.state?.back === 'string') router.back()
  else void router.replace({ query: { ...route.query, pick: undefined } })
}
</script>

<template>
  <UiBottomSheet :open="open" :title="t('newAnalysis.sheetTitle')" full :rest="fromEdge" @close="close">
    <ChatPicker>
      <!-- The people of the month, under the search and over the whole list; they step aside while you type. -->
      <template #lead><HomeMore in-sheet /></template>
    </ChatPicker>
  </UiBottomSheet>
</template>
