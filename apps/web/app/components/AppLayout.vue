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
  grid-template-columns: 248px 1fr;
  height: 100vh;
  height: 100dvh;
  min-width: 0;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  overflow: hidden;
}

.app-main {
  overflow-y: auto;
  height: 100%;
  min-height: 0;
  min-width: 0;
  padding: var(--space-6);
}

@media (max-width: 1024px) {
  .app-main {
    padding: var(--space-6);
  }
}

@media (max-width: 768px) {
  .app-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .app-main {
    padding: var(--space-4) 0 calc(var(--space-5) + env(safe-area-inset-bottom, 0px));
  }
}
</style>
