<template>
  <div class="app-layout">
    <AppSidebar />
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
  min-width: 0;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

.app-main {
  overflow-y: auto;
  min-width: 0;
  padding: var(--space-8) var(--space-10);
}

@media (max-width: 1024px) {
  .app-main {
    padding: var(--space-6);
  }
}

@media (max-width: 768px) {
  .app-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .app-main {
    padding: var(--space-4);
  }
}
</style>
