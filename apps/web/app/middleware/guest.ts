/** Login and landing pages: signed-in users go straight to their chats. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return to.path === '/' ? navigateTo('/login', { replace: true }) : undefined
  }

  const signedIn = await useAuth()
    .restoreSession()
    .catch(() => false)
  if (signedIn) return navigateTo('/dashboard', { replace: true })
  if (to.path === '/') return navigateTo('/login', { replace: true })
})
