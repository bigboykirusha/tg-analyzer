/** Signed-in pages: restore the session from the refresh cookie or go to the login page. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  try {
    if (await useAuth().restoreSession()) return
  } catch {
    return navigateTo('/offline', { replace: true })
  }
  // An invitation link survives the detour through the login page.
  const next = to.path.startsWith('/invite/') ? { next: to.fullPath } : undefined
  return navigateTo({ path: '/login', query: next }, { replace: true })
})
