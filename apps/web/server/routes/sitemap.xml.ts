/** Public pages that render on the server: the landing, the FAQ and the terms (the example report is client-only, the policy lives in a modal on /login). */
const PAGES = ['/', '/faq', '/terms']

export default defineEventHandler((event) => {
  const siteUrl = String(useRuntimeConfig(event).public.siteUrl ?? '').replace(/\/$/, '')
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  const urls = PAGES.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
})
