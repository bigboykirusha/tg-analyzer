type HydrationDebugWindow = Window & {
  __TG_HYDRATION_DEBUG__?: (reason?: string) => void
}

type WarnComponentInstance = {
  $options?: {
    name?: string
    __name?: string
  }
} | null

function stringifyArgs(args: unknown[]) {
  return args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg
      }

      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
}

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.dev) {
    return
  }

  const route = useRoute()
  const auth = useAuthStore()
  const locale = useState<'ru' | 'en'>('tg-analyzer-locale')
  const previousWarnHandler = nuxtApp.vueApp.config.warnHandler
  const previousConsoleWarn = console.warn.bind(console)
  const previousConsoleError = console.error.bind(console)

  function buildSnapshot() {
    const html = document.documentElement
    const storedLocale = localStorage.getItem('tg-analyzer-locale')

    return {
      route: route.fullPath,
      htmlLang: html.lang,
      stateLocale: locale.value,
      storedLocale,
      auth: {
        isAuthorized: auth.isAuthorized,
        hydrated: auth.hydrated,
        authHealth: auth.authHealth,
        telegramSessionActive: auth.telegramSessionActive,
        hasUser: Boolean(auth.user),
        hasAccessToken: Boolean(auth.accessToken),
      },
      hints: {
        localeMismatch: storedLocale && storedLocale !== locale.value,
        htmlLangMismatch: html.lang && html.lang !== locale.value,
        authHydrationGap: auth.hydrated && !auth.isAuthorized,
      },
    }
  }

  function logHydrationDebug(reason: string, payload?: unknown) {
    console.groupCollapsed(`[hydration-debug] ${reason}`)
    console.info('snapshot', buildSnapshot())
    if (payload !== undefined) {
      console.info('payload', payload)
    }
    console.info('hint', 'If localeMismatch/htmlLangMismatch is true, start by unifying SSR locale and localStorage locale.')
    console.info('hint', 'If authHydrationGap is true, inspect guest/auth middleware and bootstrap timing.')
    console.groupEnd()
  }

  function maybeLogHydration(reason: string, payload?: unknown) {
    if (/hydration|mismatch/i.test(reason)) {
      logHydrationDebug(reason, payload)
    }
  }

  nuxtApp.vueApp.config.warnHandler = (message, instance, trace) => {
    const componentName = (instance as WarnComponentInstance)?.$options?.name
      ?? (instance as WarnComponentInstance)?.$options?.__name
      ?? 'anonymous'

    maybeLogHydration(message, {
      component: componentName,
      trace,
    })

    previousWarnHandler?.(message, instance, trace)
  }

  console.warn = (...args: unknown[]) => {
    maybeLogHydration(stringifyArgs(args), args)
    previousConsoleWarn(...args)
  }

  console.error = (...args: unknown[]) => {
    maybeLogHydration(stringifyArgs(args), args)
    previousConsoleError(...args)
  }

  onNuxtReady(() => {
    ;(window as HydrationDebugWindow).__TG_HYDRATION_DEBUG__ = (reason = 'manual') => {
      logHydrationDebug(reason)
    }

    console.info('[hydration-debug] ready. Run window.__TG_HYDRATION_DEBUG__() in devtools for a state snapshot.')
  })
})
