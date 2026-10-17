export type ThemePreference = 'system' | 'light' | 'dark'

const THEME_COOKIE = 'tg-analyzer-theme'

/**
 * Theme preference is kept in a cookie so the server renders the right
 * `data-theme` and the page never flashes. `resolved` follows the system
 * setting live, which charts use to repaint.
 */
export function useTheme() {
  const cookie = useCookie<ThemePreference>(THEME_COOKIE, {
    default: () => 'system',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const systemDark = useState('theme-system-dark', () => false)
  const preference = computed<ThemePreference>(() =>
    cookie.value === 'light' || cookie.value === 'dark' ? cookie.value : 'system',
  )
  const resolved = computed<'light' | 'dark'>(() =>
    preference.value === 'system' ? (systemDark.value ? 'dark' : 'light') : preference.value,
  )

  function setPreference(next: ThemePreference) {
    cookie.value = next
  }

  /** Call once from the app root. */
  function install() {
    useHead({ htmlAttrs: { 'data-theme': () => (preference.value === 'system' ? undefined : preference.value) } })
    onMounted(() => {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      systemDark.value = media.matches
      media.addEventListener('change', (event) => {
        systemDark.value = event.matches
      })
    })
  }

  return { preference, resolved, setPreference, install }
}
