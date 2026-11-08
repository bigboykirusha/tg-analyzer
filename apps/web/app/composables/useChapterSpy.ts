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
    // Where a jump lands: the page's scroll padding (the pinned bar) plus the chapter's own margin.
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)
    const header = Number.isFinite(padding)
      ? padding
      : (document.querySelector<HTMLElement>('[data-toolbar], .site-header')?.offsetHeight ?? 64)
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
    if (reduce) return
    // A smooth scroll can be cut short (a sheet letting go of the page, a card growing above): once it
    // stops, the chapter checks where it landed and, if it is off, takes its place without animation.
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      window.removeEventListener('scrollend', settle)
      const target = document.getElementById(`part-${id}`)
      if (!target) return
      const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
      const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (!atBottom && Math.abs(target.getBoundingClientRect().top - padding - margin) > 24)
        target.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
    window.addEventListener('scrollend', settle)
    setTimeout(settle, 1600)
  }

  return { current, go }
}
