function cssVar(name: string, fallback = 'transparent') {
  if (!import.meta.client) {
    return fallback
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export const COLORS = {
  accent: () => cssVar('--accent'),
  sent: () => cssVar('--accent'),
  received: () => cssVar('--accent-2'),
  neutral: () => cssVar('--bg-overlay'),
  neutralSoft: () => cssVar('--border-default'),
  text: () => cssVar('--text-secondary'),
  textMuted: () => cssVar('--text-tertiary'),
  textPrimary: () => cssVar('--text-primary'),
  border: () => cssVar('--border-subtle'),
  surface: () => cssVar('--bg-elevated'),
  accentMuted: () => cssVar('--accent-subtle'),
}

export function createChartTheme() {
  return {
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Manrope, system-ui, sans-serif',
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
        fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Manrope, system-ui, sans-serif',
      },
      splitLine: { show: false },
    },
    yAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: COLORS.textMuted(),
        fontSize: 12,
        fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Manrope, system-ui, sans-serif',
      },
      splitLine: {
        lineStyle: { color: COLORS.border(), type: 'solid' },
      },
    },
    tooltip: {
      backgroundColor: cssVar('--bg-overlay'),
      borderColor: cssVar('--border-default'),
      borderWidth: 1,
      textStyle: {
        color: COLORS.textPrimary(),
        fontSize: 13,
        fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Manrope, system-ui, sans-serif',
      },
      padding: [10, 12],
      extraCssText: 'border-radius: var(--radius-sm); box-shadow: var(--shadow);',
    },
  }
}

export const CHART_THEME = {
  base: createChartTheme,
}

export function normalizeChartCount(value: unknown): number {
  return normalizeCount(value)
}
import { normalizeCount } from '@tg-analyzer/shared'
