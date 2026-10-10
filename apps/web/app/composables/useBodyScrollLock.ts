import { watch, onBeforeUnmount, type Ref } from 'vue'

const locks = new Set<symbol>()
let previousOverflow = ''

export function useBodyScrollLock(open: Ref<boolean>) {
  const token = Symbol('scroll-lock')
  function unlock() {
    if (!import.meta.client || !locks.delete(token)) return
    if (!locks.size) document.body.style.overflow = previousOverflow
  }
  watch(
    open,
    (value) => {
      if (!import.meta.client) return
      if (!value) return unlock()
      if (!locks.size) previousOverflow = document.body.style.overflow
      locks.add(token)
      document.body.style.overflow = 'hidden'
    },
    { immediate: true },
  )
  onBeforeUnmount(unlock)
}
