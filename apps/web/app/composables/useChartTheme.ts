import { normalizeCount } from '@tg-analyzer/shared'

function cssVar(name: string) {
  return import.meta.client ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : ''
}

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", Manrope, system-ui, sans-serif'

/**
 * ECharts settings derived from the CSS design tokens. Recomputed when the
 * theme changes so charts repaint with the right colours.
 */
export function useChartTheme() {
  const { resolved } = useTheme()

  return computed(() => {
    void resolved.value
    const colors = {
      sent: cssVar('--accent'),
      received: cssVar('--accent-2'),
      text: cssVar('--text'),
      muted: cssVar('--text-muted'),
      border: cssVar('--border'),
      surface: cssVar('--surface'),
    }
    const axisLabel = { color: colors.muted, fontSize: 12, fontFamily: FONT }

    return {
      colors,
      base: {
        backgroundColor: 'transparent',
        textStyle: { fontFamily: FONT, color: colors.muted },
        grid: { left: 8, right: 8, top: 12, bottom: 8, containLabel: true },
        tooltip: {
          trigger: 'axis' as const,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          padding: [10, 12],
          textStyle: { color: colors.text, fontSize: 13, fontFamily: FONT },
          extraCssText: 'border-radius: 12px;',
        },
        legend: { top: 0, icon: 'circle', textStyle: { color: colors.muted, fontFamily: FONT } },
      },
      categoryAxis: (data: string[], extra: Record<string, unknown> = {}) => ({
        type: 'category' as const,
        data,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisLabel, ...extra },
      }),
      valueAxis: {
        type: 'value' as const,
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel,
        splitLine: { lineStyle: { color: colors.border } },
      },
    }
  })
}

export const chartCount = normalizeCount
