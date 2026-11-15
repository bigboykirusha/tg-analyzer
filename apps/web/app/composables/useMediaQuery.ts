interface Shared {
  matches: Ref<boolean>
  users: number
  media?: MediaQueryList
  update: () => void
}
const queries = new Map<string, Shared>()

/** Reactive `matchMedia`; false during server rendering. One listener per query however many components ask. */
export function useMediaQuery(query: string) {
  let entry = queries.get(query)
  if (!entry) {
    const matches = ref(false)
    const created: Shared = { matches, users: 0, update: () => (matches.value = !!created.media?.matches) }
    queries.set(query, (entry = created))
  }
  const shared = entry
  onMounted(() => {
    if (!shared.users++) {
      shared.media = window.matchMedia(query)
      shared.media.addEventListener('change', shared.update)
    }
    shared.update()
  })
  onBeforeUnmount(() => {
    if (!--shared.users) shared.media?.removeEventListener('change', shared.update)
  })
  return shared.matches
}
