/** Login and landing pages: signed-in users go straight to their chats. */
export default defineNuxtRouteMiddleware(async () => {
  // The landing renders on the server for everyone; the session lives in the browser.
  if (import.meta.server) return

  const signedIn = await useAuth()
    .restoreSession()
    .catch(() => false)
  if (signedIn) return navigateTo('/dashboard', { replace: true })
})
