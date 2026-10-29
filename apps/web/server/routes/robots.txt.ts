/**
 * Private screens stay out of search; the public pages are listed in the sitemap.
 * Both use the configured site address, so staging never points at production.
 */
export default defineEventHandler((event) => {
  const siteUrl = String(useRuntimeConfig(event).public.siteUrl ?? '').replace(/\/$/, '')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /dashboard',
    'Disallow: /new',
    'Disallow: /chat/',
    'Disallow: /account',
    'Disallow: /teams',
    'Disallow: /invite/',
    'Disallow: /login',
    'Disallow: /api/',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
})
