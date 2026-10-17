<template>
  <div class="kpis"><slot /></div>
</template>

<style scoped>
.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.kpis :deep(.metric) {
  min-height: 118px;
  border: 0;
  border-right: 1px solid var(--border);
  border-radius: 0;
  background: transparent;
}

.kpis :deep(.metric:last-child) {
  border-right: 0;
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

  .kpis :deep(.metric:nth-child(2)) {
    border-right: 0;
  }

  .kpis :deep(.metric:nth-child(-n + 2)) {
    border-bottom: 1px solid var(--border);
  }
}
</style>
