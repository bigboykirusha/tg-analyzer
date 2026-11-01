/** Login and landing pages: signed-in users go straight to their chats. */
export default defineNuxtRouteMiddleware(async () => {
  // The landing renders on the server for everyone; the session lives in the browser.
  if (import.meta.server) return

  const signedIn = await useAuth()
    .restoreSession()
    .catch(() => false)
  if (!signedIn) return

  // On the first load the page in the HTML is the landing. Redirecting before it has hydrated
  // patches the workspace into the public layout's markup, and the sidebar covers the page.
  // Hydrate the landing first, then move on as an ordinary client navigation.
  const nuxtApp = useNuxtApp()
  if (nuxtApp.isHydrating) {
    nuxtApp.hooks.hookOnce('app:suspense:resolve', () => {
      void navigateTo('/dashboard', { replace: true })
    })
    return
  }
  return navigateTo('/dashboard', { replace: true })
})
