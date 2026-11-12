<script setup lang="ts">
/**
 * «Приватность»: the promise in three sentences, then the questions people ask, each opening its answer in place.
 * The answers carry everything the old policy said — what we receive, keep and do not keep, who sees it, how long
 * it stays and how to delete it — so there is one text, not a summary and a policy that can drift apart.
 * Accordions suit a FAQ: a visitor comes for one answer, not all of them (NN/g).
 */
import { ChevronDown } from '../lib/icons'
import type { MessageKey } from '../composables/useI18n'

const { t } = useI18n()
useSeoMeta({ title: () => t('privacy.pageTitle'), description: () => t('faq.seoDescription') })

const KEYS = ['read', 'keep', 'notKeep', 'notice', 'phone', 'share', 'howLong', 'delete', 'off'] as const
const questions = computed(() =>
  KEYS.map((key) => ({ key, q: t(`faq.q.${key}` as MessageKey), a: t(`faq.a.${key}` as MessageKey) })),
)
</script>

<template>
  <div class="doc">
    <header class="doc__head">
      <h1 class="t-h1">{{ t('privacy.pageTitle') }}</h1>
      <p class="t-lede">{{ t('privacy.pageLede') }}</p>
    </header>
    <section class="doc__faq" aria-labelledby="faq-title">
      <h2 id="faq-title" class="t-h3">{{ t('faq.questions') }}</h2>
      <UiGroup>
        <details v-for="item in questions" :key="item.key" class="faq">
          <summary class="faq__q">
            <span>{{ item.q }}</span>
            <ChevronDown class="faq__chevron" aria-hidden="true" />
          </summary>
          <p class="faq__a">{{ item.a }}</p>
        </details>
      </UiGroup>
    </section>
    <p class="doc__note t-label">{{ t('site.unofficial') }}</p>
  </div>
</template>

<style scoped>
.doc__note {
  color: var(--text-muted);
}

/* The page's own column, left under the logo; the text keeps a reading width inside it. */
.doc {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  width: 100%;
  max-width: calc(var(--page-max) + var(--page-gutter) * 2);
  margin: 0 auto;
  padding: var(--space-4) var(--page-gutter) var(--page-bottom);
}

.doc > * {
  max-width: var(--page-max-narrow);
}

.doc__head,
.doc__faq {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.doc__head .t-lede {
  max-width: var(--measure);
}

/*
 * One question is one row of the group: the question at the row's inset, a chevron at the end that turns over when
 * the answer is open, the fill of the whole row under the pointer, a hairline from the text to the edge between
 * questions — the same row as everywhere else.
 */
.faq {
  position: relative;
}

.faq:not(:last-child)::after {
  content: '';
  position: absolute;
  inset: auto 0 0 var(--row-inset);
  height: 1px;
  background: var(--border);
}

.faq__q {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: var(--row-height);
  padding: var(--space-3) var(--row-inset);
  font: var(--text-body);
  list-style: none;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.faq__q::-webkit-details-marker {
  display: none;
}

.faq__q > * {
  position: relative;
}

.faq__q::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--row-fill-radius);
  background: transparent;
  transition: background-color var(--transition-fast);
}

.faq[open] > .faq__q::before {
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

@media (hover: hover) and (pointer: fine) {
  .faq__q:hover::before {
    background: var(--hover);
  }
}

.faq__q:active::before {
  background: var(--pressed);
}

.faq__q:focus-visible {
  outline: none;
}

.faq__q:focus-visible::before {
  box-shadow: var(--ring-selected);
}

.faq__chevron {
  flex: none;
  width: var(--icon-sm);
  height: var(--icon-sm);
  color: var(--text-faint);
  transition: rotate var(--duration-fast) var(--ease-standard);
}

.faq[open] .faq__chevron {
  rotate: 180deg;
}

.faq__a {
  max-width: var(--measure);
  padding: 0 var(--row-inset) var(--space-4);
  color: var(--text-muted);
  font: var(--text-body);
}

@media (min-width: 901px) {
  .doc {
    gap: var(--space-10);
    padding-top: var(--page-top);
  }
}
</style>
