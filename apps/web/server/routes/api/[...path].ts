/**
 * Same-origin proxy to the API. Keeping browser traffic on this origin makes
 * the refresh cookie first-party. The target is read at runtime
 * (NUXT_API_PROXY_TARGET), so one build works in every environment.
 */
export default defineEventHandler((event) => {
  const target = useRuntimeConfig(event).apiProxyTarget.replace(/\/$/, '')
  const clientIp = getRequestIP(event, { xForwardedFor: true })
  return proxyRequest(event, `${target}${event.path}`, {
    headers: clientIp ? { 'x-forwarded-for': clientIp } : undefined,
  })
})
