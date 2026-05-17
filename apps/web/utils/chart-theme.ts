function cssVar(name: string, fallback: string) {
  if (!import.meta.client) {
    return fallback
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export const COLORS = {
  accent: () => cssVar('--accent', '#e8ff6b'),
  sent: () => cssVar('--accent', '#e8ff6b'),
  received: () => cssVar('--border-strong', '#3a3a3a'),
  neutral: () => cssVar('--bg-overlay', '#222222'),
  neutralSoft: () => cssVar('--border-default', '#2a2a2a'),
  text: () => cssVar('--text-secondary', '#888888'),
  textMuted: () => cssVar('--text-tertiary', '#555555'),
  textPrimary: () => cssVar('--text-primary', '#f0f0f0'),
  border: () => cssVar('--border-subtle', '#1f1f1f'),
  surface: () => cssVar('--bg-elevated', '#1a1a1a'),
  accentMuted: () => cssVar('--accent-subtle', 'rgba(232, 255, 107, 0.08)'),
}

export function createChartTheme() {
  return {
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: 'DM Sans, sans-serif',
      color: COLORS.text(),
    },
    color: [COLORS.accent(), COLORS.received(), COLORS.neutral(), COLORS.neutralSoft()],
    grid: {
      left: 8,
      right: 8,
      top: 12,
      bottom: 8,
      containLabel: true,
    },
    xAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: COLORS.textMuted(),
        fontSize: 12,
        fontFamily: 'DM Mono, monospace',
      },
      splitLine: { show: false },
    },
    yAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: COLORS.textMuted(),
        fontSize: 12,
        fontFamily: 'DM Mono, monospace',
      },
      splitLine: {
        lineStyle: { color: COLORS.border(), type: 'solid' },
      },
    },
    tooltip: {
      backgroundColor: cssVar('--bg-overlay', '#222222'),
      borderColor: cssVar('--border-default', '#2a2a2a'),
      borderWidth: 1,
      textStyle: { color: COLORS.textPrimary(), fontSize: 13, fontFamily: 'DM Mono, monospace' },
      padding: [10, 12],
      extraCssText: 'border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.35);',
    },
  }
}

export const CHART_THEME = {
  base: createChartTheme,
}
