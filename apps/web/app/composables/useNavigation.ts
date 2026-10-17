import type { Component } from 'vue'
import { LayoutGrid } from '../lib/icons'

export interface NavItem {
  to: string
  label: string
  icon: Component
}

/**
 * Main sections of the signed-in app, shown in the header on every screen size.
 */
export function useNavigation() {
  const { t } = useI18n()
  const route = useRoute()

  const items = computed<NavItem[]>(() => [{ to: '/dashboard', label: t('nav.chats'), icon: LayoutGrid }])
  const current = computed(() => items.value.find((item) => route.path.startsWith(item.to)) ?? null)

  return { items, current }
}
