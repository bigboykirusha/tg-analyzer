/**
 * The toolbar's two states over a page: at the top of a report it takes the poster's colour (the
 * name is on the poster, so the bar shows only its controls); once the poster scrolls away it turns
 * into glass with a hairline and shows the screen's title — Apple's large-title pattern.
 */
export function usePosterHeader() {
  const scrolled = ref(false)
  const overPoster = ref(false)
  let observer: ResizeObserver | null = null

  function update() {
    scrolled.value = window.scrollY > 4
    const poster = document.querySelector<HTMLElement>('[data-poster]')
    const bar = document.querySelector<HTMLElement>('[data-toolbar]')
    overPoster.value = Boolean(poster && poster.getBoundingClientRect().bottom > (bar?.offsetHeight ?? 64))
  }

  onMounted(() => {
    update()
    window.addEventListener('scroll', update, { passive: true })
    // The poster arrives with the report; the page growing is the signal to look again.
    observer = new ResizeObserver(update)
    observer.observe(document.body)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', update)
    observer?.disconnect()
  })
  const route = useRoute()
  watch(
    () => route.fullPath,
    () => nextTick(update),
  )

  return { scrolled, overPoster }
}
