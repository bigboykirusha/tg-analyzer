<script setup lang="ts">
import AppLayout from '../components/AppLayout.vue'

const { progress, connect, disconnect, fetchCurrentStatus } = useParseProgress()
watch(
  () => progress.value.status,
  (status) => {
    if (status === 'pending' || status === 'running') void connect()
    else disconnect()
  },
)
let poll: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  poll = setInterval(() => {
    if (['pending', 'running'].includes(progress.value.status)) {
      void fetchCurrentStatus()
      void connect()
    }
  }, 5000)
})
onBeforeUnmount(() => {
  clearInterval(poll)
  disconnect()
})
</script>

<template>
  <AppLayout><slot /></AppLayout>
</template>
