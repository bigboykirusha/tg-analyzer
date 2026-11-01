/** Signed-in pages: restore the session from the refresh cookie or go to the login page. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const nuxtApp = useNuxtApp()

  try {
    if (await useAuth().restoreSession()) return
  } catch {
    // A rejected await inside try/catch can lose Nuxt's middleware context.
    // Keep navigateTo from starting a competing router navigation in that case.
    return nuxtApp.runWithContext(() =>
      navigateTo({ path: '/offline', query: { redirect: to.fullPath } }, { replace: true }),
    )
  }
  return navigateTo('/login', { replace: true })
})
