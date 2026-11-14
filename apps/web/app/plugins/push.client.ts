/**
 * Web push in the running app: a tap on a notification while TGDuet is open moves the app to that page (the service
 * worker asks, the router goes), and once someone is signed in, a subscription this browser already has is tied to
 * them again (`usePush().refresh`).
 */
export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as { type?: string; path?: string } | null
    if (data?.type === 'tgduet:open' && data.path?.startsWith('/')) void navigateTo(data.path)
  })

  const auth = useAuthStore()
  const { refresh } = usePush()
  watch(
    () => auth.user?.id,
    (id) => {
      if (id) void refresh().catch(() => undefined)
    },
    { immediate: true },
  )
})
