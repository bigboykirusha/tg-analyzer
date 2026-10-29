/**
 * The open report tab, kept in `?tab=` so the back button and a reload return
 * to the same tab. Unknown values fall back to the first tab.
 */
export function useReportTab<T extends string>(values: readonly T[]) {
  const route = useRoute()
  const router = useRouter()
  return computed<T>({
    get: () => {
      const value = route.query.tab
      return values.includes(value as T) ? (value as T) : values[0]!
    },
    set: (value) => {
      const query = { ...route.query, tab: value === values[0] ? undefined : value }
      void router.replace({ query })
    },
  })
}
