<script setup lang="ts">
const { preference, apply } = useTheme()

definePageMeta({ layout: false })

const sections = [
  { title: 'Кнопки', description: 'Основное, вторичное и опасное действие с единым touch target.' },
  { title: 'Состояния', description: 'Загрузка, ошибка, пустое состояние и статус-капсулы.' },
  { title: 'Поверхности', description: 'Плотные карточки для данных и стекло для временных слоёв.' },
]
</script>

<template>
  <main class="design-page">
    <header class="design-header">
      <div>
        <p class="t-label">Development only</p>
        <h1 class="t-h1">TG Analyzer UI</h1>
      </div>
      <div class="design-themes" aria-label="Theme">
        <button
          v-for="theme in ['light', 'dark', 'system'] as const"
          :key="theme"
          type="button"
          :class="{ active: preference === theme }"
          @click="apply(theme)"
        >
          {{ theme }}
        </button>
      </div>
    </header>
    <section class="design-tokens" aria-label="Color tokens">
      <div class="swatch bg"><span>Background</span></div>
      <div class="swatch surface"><span>Surface</span></div>
      <div class="swatch accent"><span>Indigo</span></div>
      <div class="swatch teal"><span>Teal</span></div>
    </section>
    <section v-for="section in sections" :key="section.title" class="design-section">
      <div>
        <h2 class="t-h2">{{ section.title }}</h2>
        <p class="t-body">{{ section.description }}</p>
      </div>
      <div v-if="section.title === 'Кнопки'" class="design-row">
        <UiButton variant="primary">Анализировать</UiButton><UiButton>Отменить</UiButton
        ><UiButton variant="danger">Удалить</UiButton>
      </div>
      <div v-else-if="section.title === 'Состояния'" class="design-row">
        <UiBadge variant="success">Готово</UiBadge><UiBadge variant="running">В обработке</UiBadge
        ><UiBadge variant="danger">Ошибка</UiBadge>
      </div>
      <div v-else class="design-row"><UiMetricCard label="Сообщения" value="12 840" sub="за выбранный период" /></div>
    </section>
  </main>
</template>

<style scoped>
.design-page {
  min-height: 100dvh;
  padding: clamp(var(--space-5), 6vw, var(--space-12));
  background: var(--bg-base);
}
.design-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin: 0 auto var(--space-8);
  max-width: 1120px;
}
.design-themes,
.design-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.design-themes button {
  min-height: 40px;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-full);
  background: var(--bg-elevated);
  color: var(--text-primary);
}
.design-themes button.active {
  background: var(--accent);
  color: var(--accent-text);
}
.design-tokens,
.design-section {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
  max-width: 1120px;
  margin: 0 auto var(--space-5);
}
.swatch {
  min-height: 112px;
  display: grid;
  place-items: end start;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
}
.swatch.bg {
  background: var(--bg);
}
.swatch.surface {
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}
.swatch.accent {
  background: var(--accent);
  color: var(--accent-text);
}
.swatch.teal {
  background: var(--accent-2);
  color: var(--text-inverse);
}
.design-section {
  grid-template-columns: minmax(180px, 0.7fr) minmax(0, 1.3fr);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}
.design-section p {
  margin-top: var(--space-2);
  color: var(--text-secondary);
}
@media (max-width: 680px) {
  .design-header {
    align-items: start;
    flex-direction: column;
  }
  .design-tokens {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .design-section {
    grid-template-columns: 1fr;
  }
}
</style>
