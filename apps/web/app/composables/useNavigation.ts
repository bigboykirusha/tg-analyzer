import type { Component } from 'vue'
import { LayoutGrid, Users } from '../lib/icons'

export interface NavItem {
  to: string
  label: string
  icon: Component
}

/**
 * Main sections of the signed-in app. The header, the mobile tab bar and the
 * toast offset read this list; the tab bar only appears with two or more items.
 */
export function useNavigation() {
  const { t } = useI18n()
  const route = useRoute()

  const items = computed<NavItem[]>(() => [
    { to: '/people', label: t('nav.people'), icon: Users },
    { to: '/dashboard', label: t('nav.chats'), icon: LayoutGrid },
  ])
  const current = computed(() => items.value.find((item) => route.path.startsWith(item.to)) ?? null)
  const hasTabBar = computed(() => items.value.length > 1 && current.value !== null)

  return { items, current, hasTabBar }
}
