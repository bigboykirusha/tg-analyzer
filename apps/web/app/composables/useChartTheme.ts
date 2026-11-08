import { normalizeCount } from '@tg-analyzer/shared'

function cssVar(name: string) {
  return import.meta.client ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : ''
}

function px(name: string, fallback: number) {
  return Number.parseFloat(cssVar(name)) || fallback
}

const FALLBACK_FONT = 'Onest Variable, system-ui, sans-serif'

/**
 * ECharts settings derived from the CSS design tokens: transparent background,
 * axes without lines, `caption` labels in `text-muted`, `border` grid lines and
 * a `surface-raised` tooltip. Recomputed when the theme changes so charts
 * repaint with the right colours.
 */
export function useChartTheme() {
  const { resolved } = useTheme()
  const { formatNumber } = useI18n()

  return computed(() => {
    void resolved.value
    // Numbers in the reader's locale: «12 000», not ECharts' default «12,000».
    const number = (value: unknown) => (typeof value === 'number' ? formatNumber(value) : String(value ?? ''))
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
      // The whole chat, both sides together: never ink, which is «you».
      neutral: cssVar('--chart-neutral'),
      neutralStrong: cssVar('--chart-neutral-strong'),
      heat: [cssVar('--surface-2'), cssVar('--heat-1'), cssVar('--heat-2'), cssVar('--heat-3'), cssVar('--heat-4')],
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
        // Charts draw in on the one long duration of the system, on its ease-out — never with Reduce Motion.
        animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        animationDuration: px('--duration-chart', 800),
        animationEasing: 'cubicOut' as const,
        textStyle: { fontFamily: font, color: colors.muted },
        grid: { left: space2, right: space2, top: space3, bottom: space2, containLabel: true },
        tooltip: {
          trigger: 'axis' as const,
          // Keep the tooltip inside the chart, away from the screen edges.
          confine: true,
          valueFormatter: number,
          backgroundColor: colors.raised,
          borderColor: colors.border,
          borderWidth: 1,
          padding: [space2, space3],
          textStyle: { color: colors.text, fontSize: 13, fontFamily: font },
          extraCssText: `border-radius: ${cssVar('--radius-sm') || '10px'}; box-shadow: ${cssVar('--shadow-overlay')};`,
        },
        // The legend sits where the report's own legends sit: dots at the top left.
        legend: {
          top: 0,
          left: 0,
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
      // The report's own drawing language: shapes and their peaks, no scale and no grid. Exact values
      // live in the tooltip, as everywhere else the report says a number only when it matters.
      valueAxis: {
        type: 'value' as const,
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
    }
  })
}

export const chartCount = normalizeCount
