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
  display: block;
  min-height: 100vh;
  min-height: 100dvh;
  min-width: 0;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  overflow: visible;
}

.app-main {
  min-height: calc(100dvh - 72px);
  min-width: 0;
  padding: var(--space-10) var(--space-4) 72px;
  background: radial-gradient(70% 380px at 85% 0, var(--glow), transparent), var(--bg-base);
}

@media (max-width: 768px) {
  .app-main {
    min-height: calc(100dvh - 70px);
    padding: 18px 0 calc(112px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
