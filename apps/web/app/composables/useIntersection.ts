import type { Ref } from 'vue'

/** Calls `onVisible` whenever the target scrolls into (or near) the viewport. */
export function useIntersection(target: Ref<HTMLElement | null>, onVisible: () => void, rootMargin = '320px 0px') {
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onVisible()
      },
      { rootMargin },
    )
    watch(
      target,
      (next, previous) => {
        if (previous) observer?.unobserve(previous)
        if (next) observer?.observe(next)
      },
      { immediate: true },
    )
  })
  onBeforeUnmount(() => observer?.disconnect())
}
