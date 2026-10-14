import { useMemo } from "react";
import { useSettings } from "./hooks";
import { formatCurrency, formatPercent, formatSignedCurrency } from "@/lib/money";
import { formatDate, formatDateShort, formatDateTime, monthLabel } from "@/lib/date";
import type { ISODate, MonthKey } from "@/domain/types";

export interface MoneyFormatOptions {
  decimals?: number;
  compact?: boolean;
}

/**
 * Binds the active currency and locale from settings to formatting helpers so
 * every screen renders money and dates consistently (₹, Indian grouping).
 */
export function useFormat() {
  const { currency, locale } = useSettings();

  return useMemo(
    () => ({
      currency,
      locale,
      money: (value: number, opts: MoneyFormatOptions = {}) => formatCurrency(value, { currency, locale, ...opts }),
      moneyCompact: (value: number) => formatCurrency(value, { currency, locale, compact: true }),
      signed: (value: number, opts: MoneyFormatOptions = {}) => formatSignedCurrency(value, { currency, locale, ...opts }),
      percent: (value: number | null | undefined, decimals = 1) =>
        value === null || value === undefined || !Number.isFinite(value) ? "—" : formatPercent(value, decimals),
      date: (iso: ISODate, opts?: Intl.DateTimeFormatOptions) => formatDate(iso, locale, opts),
      dateShort: (iso: ISODate) => formatDateShort(iso, locale),
      dateTime: (value: string) => formatDateTime(value, locale),
      month: (month: MonthKey, opts?: { short?: boolean }) => monthLabel(month, opts),
    }),
    [currency, locale],
  );
}

export type Formatter = ReturnType<typeof useFormat>;
