import { normalizeCount } from '@tg-analyzer/shared'

function cssVar(name: string) {
  return import.meta.client ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : ''
}

function px(name: string, fallback: number) {
  return Number.parseFloat(cssVar(name)) || fallback
}

const FALLBACK_FONT = 'Geist Variable, system-ui, sans-serif'

/**
 * ECharts settings derived from the CSS design tokens: transparent background,
 * axes without lines, `caption` labels in `text-muted`, `border` grid lines and
 * a `surface-raised` tooltip. Recomputed when the theme changes so charts
 * repaint with the right colours.
 */
export function useChartTheme() {
  const { resolved } = useTheme()

  return computed(() => {
    void resolved.value
    const font = cssVar('--font-sans') || FALLBACK_FONT
    const colors = {
      sent: cssVar('--you'),
      received: cssVar('--them'),
      text: cssVar('--text'),
      muted: cssVar('--text-muted'),
      border: cssVar('--border'),
      surface: cssVar('--surface'),
      raised: cssVar('--surface-raised'),
      warning: cssVar('--warning'),
      heat: [cssVar('--surface-2'), cssVar('--heat-1'), cssVar('--heat-2'), cssVar('--heat-3'), cssVar('--text')],
    }
    const space2 = px('--space-2', 8)
    const space3 = px('--space-3', 12)
    const axisLabel = { color: colors.muted, fontSize: 12, lineHeight: 16, fontWeight: 500, fontFamily: font }

    return {
      colors,
      /** Bar corners: 3px on the top edge only. */
      barRadius: [3, 3, 0, 0] as [number, number, number, number],
      base: {
        backgroundColor: 'transparent',
        textStyle: { fontFamily: font, color: colors.muted },
        grid: { left: space2, right: space2, top: space3, bottom: space2, containLabel: true },
        tooltip: {
          trigger: 'axis' as const,
          backgroundColor: colors.raised,
          borderColor: colors.border,
          borderWidth: 1,
          padding: [space2, space3],
          textStyle: { color: colors.text, fontSize: 13, fontFamily: font },
          extraCssText: `border-radius: ${cssVar('--radius-sm') || '10px'}; box-shadow: ${cssVar('--shadow-overlay')};`,
        },
        legend: {
          bottom: 0,
          icon: 'circle',
          itemWidth: 8,
          itemHeight: 8,
          itemGap: px('--space-4', 16),
          textStyle: { color: colors.muted, fontSize: 13, fontFamily: font },
        },
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
