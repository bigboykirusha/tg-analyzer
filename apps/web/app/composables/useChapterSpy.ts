/**
 * Which chapter of the report the reader is in: the last `#part-<id>` whose top has passed under the
 * header. One read per frame. At the very bottom the last chapter wins even if it is too short to
 * reach the line.
 */
export function useChapterSpy(ids: () => string[]) {
  const current = ref<string | null>(null)
  let frame = 0

  function read() {
    frame = 0
    const header = document.querySelector<HTMLElement>('[data-toolbar], .site-header')?.offsetHeight ?? 64
    let found: string | null = null
    for (const id of ids()) {
      const part = document.getElementById(`part-${id}`)
      // A chapter counts as reached once it is where a jump to it lands (under the header, plus its margin).
      const margin = part ? Number.parseFloat(getComputedStyle(part).scrollMarginTop) || 0 : 0
      if (part && part.getBoundingClientRect().top <= header + margin + 8) found = id
    }
    if (found && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2)
      found = ids().at(-1) ?? found
    current.value = found
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(read)
  }

  onMounted(() => {
    window.addEventListener('scroll', schedule, { passive: true })
    read()
  })
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', schedule)
  })

  /** Jump to a chapter: the browser scrolls (smoothly unless motion is reduced) and the URL keeps the place. */
  function go(id: string) {
    const part = document.getElementById(`part-${id}`)
    if (!part) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    history.replaceState(history.state, '', `#part-${id}`)
    part.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  return { current, go }
}
