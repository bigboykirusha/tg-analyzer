import type { Component } from 'vue'
import { Ban, Check, Eye, Lock, Power, Trash2 } from '../lib/icons'
import type { MessageKey } from './useI18n'

/** The privacy promise as six facts (the privacy page and the side of the FAQ share them). */
export function usePrivacyFacts() {
  const { t } = useI18n()
  return computed(() =>
    (
      [
        ['read', Eye],
        ['keep', Check],
        ['notKeep', Lock],
        ['never', Ban],
        ['off', Power],
        ['delete', Trash2],
      ] as [string, Component][]
    ).map(([key, icon]) => ({
      key,
      icon,
      title: t(`faq.${key}.title` as MessageKey),
      text: t(`faq.${key}.text` as MessageKey),
    })),
  )
}
