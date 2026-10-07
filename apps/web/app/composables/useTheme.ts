export type ThemePreference = 'system' | 'light' | 'dark'

const THEME_STORAGE_KEY = 'tg-analyzer-theme'

export function useTheme() {
  const preference = useState<ThemePreference>('theme-preference', () => 'system')

  function apply(next: ThemePreference) {
    preference.value = next
    if (!import.meta.client) {
      return
    }

    if (next === 'system') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.dataset.theme = next
    }
    localStorage.setItem(THEME_STORAGE_KEY, next)
  }

  function hydrate() {
    if (!import.meta.client) {
      return
    }
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    apply(stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system')
  }

  return { preference, apply, hydrate }
}
