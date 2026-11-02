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

  function layout() {
    const element = container.value
    if (!element) return
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0
    for (const child of Array.from(element.children) as HTMLElement[]) {
      if (wide?.matches) child.style.gridRowEnd = `span ${Math.ceil(child.getBoundingClientRect().height) + gap}`
      else child.style.removeProperty('grid-row-end')
    }
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
