/**
 * Timezone-safe date helpers.
 *
 * Financial data is stored as calendar dates (`YYYY-MM-DD` strings) and months
 * (`YYYY-MM`). We never round-trip through `Date.toISOString()` for storage,
 * because that silently shifts a transaction into the previous/next day (and
 * occasionally the wrong month) for users east or west of UTC.
 */

import type { ISODate, MonthKey, YearKey } from "@/domain/types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTH_ABBR = MONTH_NAMES.map((m) => m.slice(0, 3));

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar date as `YYYY-MM-DD` (no UTC conversion). */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function toMonthKey(iso: ISODate): MonthKey {
  return iso.slice(0, 7);
}

export function monthKeyOf(year: number, month: number): MonthKey {
  return `${year}-${pad2(month)}`;
}

export function parseMonthKey(mk: MonthKey): { year: number; month: number } {
  const [y, m] = mk.split("-");
  return { year: Number(y), month: Number(m) };
}

export function yearOf(iso: ISODate): YearKey {
  return Number(iso.slice(0, 4));
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month } = { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) };
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

export function isValidMonthKey(value: unknown): value is MonthKey {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

/** Month length, leap-year aware (Feb 2024 → 29). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function monthStart(mk: MonthKey): ISODate {
  return `${mk}-01`;
}

export function monthEnd(mk: MonthKey): ISODate {
  const { year, month } = parseMonthKey(mk);
  return `${mk}-${pad2(daysInMonth(year, month))}`;
}

/** Inclusive list of every date in the month. */
export function datesInMonth(mk: MonthKey): ISODate[] {
  const { year, month } = parseMonthKey(mk);
  const total = daysInMonth(year, month);
  const out: ISODate[] = [];
  for (let d = 1; d <= total; d += 1) out.push(`${mk}-${pad2(d)}`);
  return out;
}

export function addMonths(mk: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(mk);
  const zeroBased = year * 12 + (month - 1) + delta;
  const y = Math.floor(zeroBased / 12);
  const m = (zeroBased % 12) + 1;
  return monthKeyOf(y, m);
}

export function previousMonth(mk: MonthKey): MonthKey {
  return addMonths(mk, -1);
}

export function nextMonth(mk: MonthKey): MonthKey {
  return addMonths(mk, 1);
}

export function monthsInYear(year: YearKey): MonthKey[] {
  return Array.from({ length: 12 }, (_, i) => monthKeyOf(year, i + 1));
}

export function currentMonthKey(): MonthKey {
  return toMonthKey(todayISO());
}

export function currentYear(): YearKey {
  return new Date().getFullYear();
}

/** Whole months from `a` to `b` (positive when `b` is later). */
export function monthsBetween(a: MonthKey, b: MonthKey): number {
  const pa = parseMonthKey(a);
  const pb = parseMonthKey(b);
  return (pb.year * 12 + pb.month) - (pa.year * 12 + pa.month);
}

export function compareMonthKeys(a: MonthKey, b: MonthKey): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function isMonthInRange(mk: MonthKey, start: MonthKey, end: MonthKey): boolean {
  return mk >= start && mk <= end;
}

export function monthLabel(mk: MonthKey, opts: { short?: boolean } = {}): string {
  const { year, month } = parseMonthKey(mk);
  return opts.short ? `${MONTH_ABBR[month - 1]} ${year}` : `${MONTH_NAMES[month - 1]} ${year}`;
}

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

export function formatDate(
  iso: ISODate,
  locale = "en-IN",
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
): string {
  if (!isValidISODate(iso)) return iso;
  const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return new Intl.DateTimeFormat(locale, opts).format(d);
}

/** `12 Mar` style short label used in dense transaction rows. */
export function formatDateShort(iso: ISODate, locale = "en-IN"): string {
  return formatDate(iso, locale, { day: "2-digit", month: "short" });
}

export function formatDateTime(value: string, locale = "en-IN"): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Milliseconds since epoch for an ISO date, anchored to local midnight. */
export function isoToEpoch(iso: ISODate): number {
  return new Date(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
  ).getTime();
}

export function eachMonthBetween(start: MonthKey, end: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 1200) {
    out.push(cursor);
    cursor = addMonths(cursor, 1);
    guard += 1;
  }
  return out;
}

export function daysBetween(a: ISODate, b: ISODate): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((isoToEpoch(b) - isoToEpoch(a)) / MS_PER_DAY);
}
