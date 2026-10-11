export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    // The refresh cookie belongs to the API host and is not visible to a separately hosted web app.
    // Render the route shell, then let the browser restore the session directly from the API.
    return
  }

  const auth = useAuthStore()
  const { bootstrap } = useAuth()

  await bootstrap()
  if (!auth.isAuthorized) {
    if (auth.authHealth === 'degraded') {
      return navigateTo('/offline?reason=session', { replace: true })
    }
    return navigateTo('/login', { replace: true })
  }
})
