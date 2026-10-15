/**
 * Shared Recharts theming.
 *
 * The design tokens in `index.css` are `oklch(...)` values, so charts must
 * reference the raw CSS custom properties (`var(--color-…)`) rather than wrap
 * them in `hsl()`. Doing so keeps charts correct in both light and dark themes.
 */

export const CHART = {
  income: "var(--color-success)",
  expense: "var(--color-destructive)",
  savings: "var(--color-chart-1)",
  investment: "var(--color-chart-4)",
  primary: "var(--color-primary)",
  grid: "var(--color-border)",
  axis: "var(--color-muted-foreground)",
} as const;

export const AXIS_PROPS = {
  stroke: CHART.axis,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  borderColor: "var(--color-border)",
  borderRadius: "8px",
  color: "var(--color-foreground)",
  fontSize: "12px",
} as const;

export const GRID_PROPS = {
  strokeDasharray: "3 3",
  vertical: false,
  opacity: 0.25,
  stroke: CHART.grid,
} as const;
