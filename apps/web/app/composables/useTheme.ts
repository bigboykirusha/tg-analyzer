export type ThemePreference = 'system' | 'light' | 'dark'

const THEME_COOKIE = 'tg-analyzer-theme'

/**
 * Theme preference is kept in a cookie so the server renders the right
 * `data-theme` and the page never flashes; with «system» a head script marks
 * a dark system before the first paint. `resolved` follows the system
 * setting live, which charts use to repaint.
 */
export function useTheme() {
  const cookie = useCookie<ThemePreference>(THEME_COOKIE, {
    default: () => 'system',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  // Read on the client before the first render, so hydration keeps the attribute the head script set.
  const systemDark = useState('theme-system-dark', () => false)
  if (import.meta.client && !systemDark.value)
    systemDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  const preference = computed<ThemePreference>(() =>
    cookie.value === 'light' || cookie.value === 'dark' ? cookie.value : 'system',
  )
  const resolved = computed<'light' | 'dark'>(() =>
    preference.value === 'system' ? (systemDark.value ? 'dark' : 'light') : preference.value,
  )

  /** Switch in one frame: transitions pause so the page never shows half light, half dark. */
  function withoutTransitions(change: () => void) {
    if (!import.meta.client) return change()
    const root = document.documentElement
    root.setAttribute('data-theme-switching', '')
    change()
    requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute('data-theme-switching')))
  }

  function setPreference(next: ThemePreference) {
    withoutTransitions(() => {
      cookie.value = next
    })
  }

  /** Call once from the app root. */
  function install() {
    // The server knows only an explicit choice; in the browser «system» resolves to light or dark.
    useHead({
      htmlAttrs: {
        'data-theme': () =>
          preference.value !== 'system' ? preference.value : import.meta.client ? resolved.value : undefined,
      },
    })
    onMounted(() => {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      systemDark.value = media.matches
      media.addEventListener('change', (event) => {
        withoutTransitions(() => {
          systemDark.value = event.matches
        })
      })
    })
  }

  return { preference, resolved, setPreference, install }
}
