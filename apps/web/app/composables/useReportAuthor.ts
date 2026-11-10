import type { ComputedRef, InjectionKey } from 'vue'

const KEY: InjectionKey<ComputedRef<string | null>> = Symbol('report-author')

/**
 * A report opened by its owner says «Вы»; the same cards on a shared link name the author instead
 * («Дима», or «Автор» when names are hidden). The guest page provides the name, cards read it.
 */
export function provideReportAuthor(name: () => string | null) {
  provide(KEY, computed(name))
}

/** The author's name on a shared link, null in the owner's own report. */
export function useReportAuthor() {
  return inject(
    KEY,
    computed(() => null),
  )
}

/** «Вы» for the owner, the author's name for a guest: the left side of every comparison. */
export function useYouLabel() {
  const { t } = useI18n()
  const author = useReportAuthor()
  return computed(() => author.value ?? t('report.you'))
}
