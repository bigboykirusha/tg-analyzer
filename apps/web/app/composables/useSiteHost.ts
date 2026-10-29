/**
 * The address people type to make their own report: the configured site's
 * host («tganalyzer.app»), or the brand domain while running locally.
 */
export function useSiteHost() {
  const config = useRuntimeConfig()
  const { t } = useI18n()
  return computed(() => {
    try {
      const host = new URL(String(config.public.siteUrl)).hostname
      if (host && host !== 'localhost' && !/^\d+(?:\.\d+){3}$/.test(host)) return host.replace(/^www\./, '')
    } catch {
      // Fall through to the brand domain.
    }
    return t('story.site')
  })
}
