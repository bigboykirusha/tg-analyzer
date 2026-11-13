/**
 * The landing and the login page carry the step transition (base.css, .page-step) in their own meta, so the page
 * that is on the screen first is already wrapped in it. This keeps the step to the path between the two of them:
 * any other way in or out of them — signing out from the account, signing in to the dashboard — changes at once.
 * Above all those change the layout too: Nuxt does not run a page transition across layouts, and with `out-in` it
 * could leave the screen blank.
 */
const PAIR = new Set(['/', '/login'])

export default defineNuxtRouteMiddleware((to, from) => {
  if (!to.meta.pageTransition) return
  if (!(PAIR.has(to.path) && PAIR.has(from.path))) to.meta.pageTransition = false
})
