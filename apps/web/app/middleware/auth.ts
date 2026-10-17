/** Signed-in pages: restore the session from the refresh cookie or go to the login page. */
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  try {
    if (await useAuth().restoreSession()) return
  } catch {
    return navigateTo('/offline', { replace: true })
  }
  return navigateTo('/login', { replace: true })
})
