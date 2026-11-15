/** One shared timestamp per interval: it ticks while any component using it is mounted, and not at all otherwise. */
const tickers = new Map<number, { now: Ref<number>; users: number; timer?: ReturnType<typeof setInterval> }>()

export function useNow(intervalMs = 1000) {
  let ticker = tickers.get(intervalMs)
  if (!ticker) tickers.set(intervalMs, (ticker = { now: ref(Date.now()), users: 0 }))
  const shared = ticker
  onMounted(() => {
    if (shared.users++) return
    shared.now.value = Date.now()
    shared.timer = setInterval(() => (shared.now.value = Date.now()), intervalMs)
  })
  onBeforeUnmount(() => {
    if (!--shared.users) clearInterval(shared.timer)
  })
  return shared.now
}
