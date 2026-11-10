/**
 * Reports uncaught browser errors to our own API (POST /api/v1/client-errors), where they land
 * in the log as `client_error`. No third-party service and nothing personal: the route pattern
 * (`/chat/:id`, not the address), a short message and stack with URLs cut to paths, the build
 * and the user-agent. Repeats are sent once, and a page sends only a handful.
 */
const ENDPOINT = '/api/v1/client-errors'
const MAX_REPORTS_PER_PAGE = 10
const LIMITS = { message: 300, stack: 2000, route: 120, build: 64, ua: 200 }
/** Noise that says nothing about our code: network drops, extensions, browser quirks. */
const IGNORED = [
  /ResizeObserver loop/i,
  /Failed to fetch|NetworkError|Load failed|AbortError|The operation was aborted/i,
  /^Script error\.?$/i,
  /chrome-extension:|moz-extension:|safari-extension:/i,
]

type Kind = 'vue' | 'app' | 'window' | 'promise'

const clip = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value)
/** Addresses may carry tokens or ids in the path or query: keep only the path of a file. */
function stripUrls(text: string) {
  return text.replace(/https?:\/\/[^\s)'"]+/g, (url) => {
    try {
      return new URL(url).pathname
    } catch {
      // A malformed address may still hold a token: cut it whole.
      return '[url]'
    }
  })
}

function describe(error: unknown) {
  if (error instanceof Error) return { message: error.message, stack: error.stack ?? '' }
  if (typeof error === 'string') return { message: error, stack: '' }
  try {
    return { message: JSON.stringify(error) ?? String(error), stack: '' }
  } catch {
    return { message: String(error), stack: '' }
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const build = String(useRuntimeConfig().app.buildId ?? '')
  const seen = new Set<string>()

  function report(kind: Kind, error: unknown) {
    if (seen.size >= MAX_REPORTS_PER_PAGE) return
    const { message, stack } = describe(error)
    if (!message || IGNORED.some((pattern) => pattern.test(message) || pattern.test(stack))) return
    const cleanMessage = clip(stripUrls(message), LIMITS.message)
    const cleanStack = clip(stripUrls(stack), LIMITS.stack)
    const fingerprint = `${kind}|${cleanMessage}|${cleanStack.split('\n')[1] ?? ''}`
    if (seen.has(fingerprint)) return
    seen.add(fingerprint)

    const current = router.currentRoute.value
    const body = JSON.stringify({
      kind,
      route: clip(current.matched.at(-1)?.path || current.path.replace(/\/[^/]*$/, '/…'), LIMITS.route),
      message: cleanMessage,
      stack: cleanStack,
      build: clip(build, LIMITS.build),
      ua: clip(navigator.userAgent, LIMITS.ua),
    })
    // Never throw from the reporter: it runs inside error handlers.
    try {
      void fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'omit',
      }).catch(() => undefined)
    } catch {
      // ignore
    }
  }

  nuxtApp.hook('vue:error', (error) => report('vue', error))
  nuxtApp.hook('app:error', (error) => report('app', error))
  window.addEventListener('error', (event) => report('window', event.error ?? event.message))
  window.addEventListener('unhandledrejection', (event) => report('promise', event.reason))
})
