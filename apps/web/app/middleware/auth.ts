export default defineNuxtRouteMiddleware(async () => {
  if (!import.meta.client) {
    return
  }

  const auth = useAuthStore()
  const { bootstrap } = useAuth()

  await bootstrap()
  if (!auth.isAuthorized) {
    return navigateTo('/login', { replace: true })
  }
})
