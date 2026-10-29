/** True once the page scrolls under the sticky header, so the header can show its hairline. */
export function useScrolled(threshold = 4) {
  const scrolled = ref(false)
  function onScroll() {
    scrolled.value = window.scrollY > threshold
  }
  onMounted(() => {
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  })
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
  return scrolled
}
