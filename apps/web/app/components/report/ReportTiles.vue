<script setup lang="ts">
export interface ReportTile {
  key: string
  /** The number itself, large: «12 ч 21 мин», «78 сообщений», «230». */
  value: string
  /** What it is: «Самый долгий разговор». */
  label: string
  /** When or whose: «20 октября», «в среднем по 21 сообщению». */
  sub?: string | null
}

/**
 * Findings as a grid of big numbers inside a card (two columns, a hairline above): the records, the formats,
 * the voice. Each interesting number gets the size of a number, not of a line of text.
 */
defineProps<{ tiles: ReportTile[] }>()
</script>

<template>
  <dl class="tiles">
    <div v-for="tile in tiles" :key="tile.key" class="tiles__item">
      <dt class="t-label tiles__label">{{ tile.label }}</dt>
      <dd class="t-h2 tiles__value">{{ tile.value }}</dd>
      <dd v-if="tile.sub" class="t-label tiles__sub">{{ tile.sub }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4) var(--space-3);
  padding-top: var(--space-3);
  box-shadow: var(--divider-top);
}

.tiles__item {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
  min-width: 0;
}

.tiles__label {
  order: -1;
}

.tiles__label,
.tiles__sub {
  color: var(--text-muted);
}

.tiles__value {
  letter-spacing: var(--tracking-h2);
  overflow-wrap: anywhere;
}
</style>
