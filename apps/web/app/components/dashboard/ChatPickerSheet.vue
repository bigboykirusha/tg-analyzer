<script setup lang="ts">
/**
 * «Чаты Telegram» on a phone: the chat list as a sheet over the screen you are on, instead of a page of
 * its own, the people of the month over the list. It has its own URL (`?pick`), so the browser's back closes it;
 * `/new` stays for wide screens and direct links. On home its edge rests at the bottom (HomeChatsPeek); opened by its
 * search (`?pick=search`) the sheet arrives with the caret in its search.
 */
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const open = computed(() => route.query.pick !== undefined)

function close() {
  // Opened from inside the app: step back; opened by a link: just drop the query.
  if (typeof window !== 'undefined' && typeof window.history.state?.back === 'string') router.back()
  else void router.replace({ query: { ...route.query, pick: undefined } })
}
</script>

<template>
  <UiBottomSheet
    :open="open"
    :title="t('newAnalysis.sheetTitle')"
    :initial-focus="route.query.pick === 'search' ? 'input[type=search]' : ''"
    @close="close"
  >
    <ChatPicker class="picker-sheet">
      <!-- The people of the month, under the search and over the whole list; they step aside while you type. -->
      <template #lead><HomeMore in-sheet /></template>
    </ChatPicker>
  </UiBottomSheet>
</template>

<style scoped>
.picker-sheet {
  min-height: 60dvh;
}
</style>
