<template>
  <div class="kpis"><slot /></div>
</template>

<style scoped>
/* Exactly four MetricCards; transparent cells divided by hairlines. */
.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.kpis :deep(.metric) {
  padding: var(--space-5);
  border-radius: 0;
  background: transparent;
  box-shadow: 1px 0 0 var(--border);
}

.kpis :deep(.metric-sub) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .kpis :deep(.metric) {
    box-shadow:
      1px 0 0 var(--border),
      0 1px 0 var(--border);
  }
}
</style>
