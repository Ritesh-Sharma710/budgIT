import { CURRENCIES } from "@/domain/constants";

/** Round to 2 decimals, avoiding float drift like 0.1 + 0.2 = 0.30000000000004. */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const rounded = Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;
  const out = sign * rounded;
  return out === 0 ? 0 : out;
}

/** Sum a list of amounts and round once at the end so totals reconcile. */
export function sum(values: number[]): number {
  return roundCurrency(values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0));
}

export function currencyMeta(code: string) {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/**
 * Format money with correct grouping for the active locale.
 * Indian grouping (₹12,34,567.00) comes free from the `en-IN` locale.
 */
export function formatCurrency(
  value: number,
  opts: { currency?: string; locale?: string; decimals?: number; compact?: boolean } = {},
): string {
  const currency = opts.currency ?? "INR";
  const locale = opts.locale ?? currencyMeta(currency).locale;
  const safe = Number.isFinite(value) ? value : 0;

  if (opts.compact) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(safe);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: opts.decimals ?? 2,
    maximumFractionDigits: opts.decimals ?? 2,
  }).format(safe);
}

/** Signed currency, e.g. `−₹1,200.00` / `+₹500.00`. */
export function formatSignedCurrency(value: number, opts: Parameters<typeof formatCurrency>[1] = {}) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatCurrency(Math.abs(value), opts)}`;
}

export function formatNumber(value: number, locale = "en-IN", decimals = 2): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

/** Parse user input like `1,20,000`, `12,000.50`, `₹500` into a number. */
export function parseAmount(input: string | number): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  const cleaned = input.replace(/[^\d.-]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!denominator) return fallback;
  return numerator / denominator;
}

/**
 * Savings rate = net savings / income × 100. Returns `null` (not 0) when there
 * is no income, so the UI can show "—" instead of a misleading 0%.
 */
export function savingsRate(netSavings: number, income: number): number | null {
  if (income <= 0) return null;
  return (netSavings / income) * 100;
}

export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
