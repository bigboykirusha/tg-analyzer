<script setup lang="ts">
/**
 * «Чаты Telegram» on a phone: the chat list as a sheet over the screen you are on, instead of a page of
 * its own. It has its own URL (`?pick`), so the browser's back closes it; `/new` stays for wide screens and direct
 * links. It takes the whole screen (a list of hundreds of chats). On a phone's home the list is not this sheet but
 * the sheet resting at the bottom of home itself (HomeChatsSheet), which answers `?pick` there.
 */
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const narrow = useMediaQuery('(max-width: 900px)')
const open = computed(() => route.query.pick !== undefined && !(narrow.value && route.path === '/dashboard'))

function close() {
  // Opened from inside the app: step back; opened by a link: just drop the query.
  if (typeof window !== 'undefined' && typeof window.history.state?.back === 'string') router.back()
  else void router.replace({ query: { ...route.query, pick: undefined } })
}
</script>

<template>
  <UiBottomSheet :open="open" :title="t('newAnalysis.sheetTitle')" full @close="close">
    <ChatPicker />
  </UiBottomSheet>
</template>
