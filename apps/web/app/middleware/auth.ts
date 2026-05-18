export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    const cookieHeader = useRequestHeaders(['cookie']).cookie ?? ''
    if (!cookieHeader.includes('tg_analyzer_refresh=')) {
      return navigateTo('/login', { replace: true })
    }
    return
  }

  const auth = useAuthStore()
  const { bootstrap } = useAuth()

  await bootstrap()
  if (!auth.isAuthorized) {
    return navigateTo('/login', { replace: true })
  }
})
