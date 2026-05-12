export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) {
    return
  }

  const auth = useAuthStore()
  const { bootstrap } = useAuth()

  await bootstrap()

  if (auth.isAuthorized) {
    return navigateTo('/dashboard')
  }

  if (to.path === '/') {
    return navigateTo('/login')
  }
})
