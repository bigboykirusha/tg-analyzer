/**
 * Masonry for a two-column grid of cards of unequal height: the grid has rows of 1px,
 * and each card spans as many rows as it is tall, so the next card lands in whichever
 * column frees up first. The cards stay in the DOM in reading order and keep their own
 * height; on phones the container is a plain column and nothing is measured.
 */
export function useMasonry(container: Ref<HTMLElement | null>) {
  const ready = ref(false)
  let resize: ResizeObserver | undefined
  let mutation: MutationObserver | undefined
  let frame = 0
  let wide: MediaQueryList | undefined

  function span(child: HTMLElement, gap: number) {
    child.style.gridRowEnd = `span ${Math.ceil(child.getBoundingClientRect().height) + gap}`
  }

  /**
   * The last card can land alone under one column and leave a hole beside it. When it hangs
   * below the other column by more than half its height, it takes the full width instead.
   */
  function widenLast(element: HTMLElement, gap: number) {
    const cards = (Array.from(element.children) as HTMLElement[]).filter((child) => child.offsetParent !== null)
    const last = cards.at(-1)
    if (!last || cards.length < 3 || getComputedStyle(last).gridColumnEnd === '-1') return
    const box = element.getBoundingClientRect()
    const middle = box.left + box.width / 2
    const own = last.getBoundingClientRect()
    const leftSide = own.left < middle
    const other = cards
      .slice(0, -1)
      .filter((child) => child.getBoundingClientRect().left < middle !== leftSide)
      .reduce((bottom, child) => Math.max(bottom, child.getBoundingClientRect().bottom), box.top)
    if (own.bottom - other > own.height / 2) {
      last.dataset.masonryWide = ''
      span(last, gap)
    }
  }

  function layout() {
    const element = container.value
    if (!element) return
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0
    for (const child of Array.from(element.children) as HTMLElement[]) {
      delete child.dataset.masonryWide
      if (wide?.matches) span(child, gap)
      else child.style.removeProperty('grid-row-end')
    }
    if (wide?.matches) widenLast(element, gap)
    ready.value = true
  }

  function schedule() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(layout)
  }

  function watch() {
    const element = container.value
    if (!element) return
    resize?.disconnect()
    for (const child of Array.from(element.children)) resize?.observe(child)
    schedule()
  }

  onMounted(() => {
    wide = window.matchMedia('(min-width: 901px)')
    resize = new ResizeObserver(schedule)
    mutation = new MutationObserver(watch)
    if (container.value) mutation.observe(container.value, { childList: true })
    wide.addEventListener('change', schedule)
    watch()
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    resize?.disconnect()
    mutation?.disconnect()
    wide?.removeEventListener('change', schedule)
  })

  return { ready }
}
