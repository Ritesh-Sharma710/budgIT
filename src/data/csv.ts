/**
 * CSV import / export.
 *
 * The export is a flat, human-readable table that opens cleanly in Excel and
 * Google Sheets. The importer is deliberately forgiving about headers and date
 * formats but strict about amounts and transaction types, and it reports every
 * row it could not read instead of dropping data silently.
 */

import Papa from "papaparse";
import type { Category, PaymentMethod, Transaction, TransactionType } from "@/domain/types";
import { SCHEMA_VERSION, TRANSACTION_TYPES } from "@/domain/types";
import { dedupeHashFor } from "@/domain/dedupe";
import { createId } from "@/lib/id";
import { isValidISODate, nowISO, toISODate } from "@/lib/date";
import { parseAmount, roundCurrency } from "@/lib/money";

export const CSV_HEADERS = [
  "id",
  "date",
  "description",
  "amount",
  "type",
  "category",
  "subcategory",
  "paymentMethod",
  "tags",
  "notes",
] as const;

export function transactionsToCsv(
  transactions: Transaction[],
  categories: Category[],
  paymentMethods: PaymentMethod[],
): string {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const pmById = new Map(paymentMethods.map((p) => [p.id, p]));

  const rows = transactions.map((tx) => {
    const category = catById.get(tx.categoryId);
    const parent = category?.parentId ? catById.get(category.parentId) : undefined;
    return {
      id: tx.id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount.toFixed(2),
      type: tx.type,
      category: parent ? parent.name : category?.name ?? "",
      subcategory: parent ? category?.name ?? "" : "",
      paymentMethod: pmById.get(tx.paymentMethodId)?.name ?? "",
      tags: tx.tags.join("; "),
      notes: tx.notes ?? "",
    };
  });

  return Papa.unparse(rows, { columns: [...CSV_HEADERS] });
}

/* -------------------------------------------------------------------------- */
/* Import                                                                       */
/* -------------------------------------------------------------------------- */

export interface CsvImportOptions {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  /** When true, unknown category names become new categories. */
  createMissingCategories?: boolean;
}

export interface CsvImportRowResult {
  row: number;
  errors: string[];
}

export interface CsvImportResult {
  transactions: Omit<Transaction, "createdAt">[];
  errors: CsvImportRowResult[];
  newCategories: { name: string; type: "expense" | "income" | "savings" | "investment" }[];
  totalRows: number;
}

const HEADER_ALIASES: Record<string, string> = {
  date: "date",
  transactiondate: "date",
  description: "description",
  desc: "description",
  details: "description",
  narration: "description",
  amount: "amount",
  value: "amount",
  type: "type",
  transactiontype: "type",
  category: "category",
  subcategory: "subcategory",
  paymentmethod: "paymentMethod",
  method: "paymentMethod",
  account: "paymentMethod",
  tags: "tags",
  notes: "notes",
  note: "notes",
  memo: "notes",
};

function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/[^a-z]/g, "");
  return HEADER_ALIASES[key] ?? header.trim();
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** Accepts ISO, `DD/MM/YYYY` and `DD-MM-YYYY`, plus ISO date-times. */
export function parseFlexibleDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const iso = raw.slice(0, 10);
    if (isValidISODate(iso)) return iso;
  }

  const match = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (isValidISODate(iso)) return iso;
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return toISODate(parsed);
  return null;
}

function normalizeType(value: string, categories: Category[], categoryId: string | null): TransactionType {
  const raw = slug(value);
  const direct = TRANSACTION_TYPES.find((t) => t === raw);
  if (direct) return direct;

  const aliases: Record<string, TransactionType> = {
    credit: "income",
    inflow: "income",
    deposit: "income",
    debit: "expense",
    outflow: "expense",
    withdrawal: "expense",
    spend: "expense",
    saving: "savings_contribution",
    savings: "savings_contribution",
    investment: "investment_contribution",
    invest: "investment_contribution",
    xfer: "transfer",
  };
  if (aliases[raw]) return aliases[raw];

  // Fall back to the category's own type so a missing column still works.
  const category = categories.find((c) => c.id === categoryId);
  if (category) {
    if (category.type === "income") return "income";
    if (category.type === "savings") return "savings_contribution";
    if (category.type === "investment") return "investment_contribution";
  }
  return "expense";
}

export function parseTransactionsCsv(text: string, options: CsvImportOptions): CsvImportResult {
  const parsed = Papa.parse<Record<string, unknown>>(text.trim(), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
  });

  const errors: CsvImportRowResult[] = [];
  const transactions: CsvImportResult["transactions"] = [];
  const newCategories: CsvImportResult["newCategories"] = [];
  const newCategoryNames = new Set<string>();

  const catByName = new Map(options.categories.map((c) => [c.name.trim().toLowerCase(), c]));
  const pmByName = new Map(options.paymentMethods.map((p) => [p.name.trim().toLowerCase(), p]));

  const now = nowISO();

  (parsed.data ?? []).forEach((row, i) => {
    const rowNumber = i + 2; // +1 header, +1 for 1-based
    const rowErrors: string[] = [];

    const date = parseFlexibleDate(row.date);
    if (!date) rowErrors.push("Missing or unreadable date.");

    const rawAmount = row.amount;
    const amount = Math.abs(parseAmount(rawAmount === undefined || rawAmount === null ? "" : String(rawAmount)));
    if (!Number.isFinite(amount) || amount === 0) rowErrors.push("Amount must be a non-zero number.");

    const description = String(row.description ?? "").trim();
    if (!description) rowErrors.push("Description is required.");

    const categoryName = String(row.category ?? "").trim();
    let category = categoryName ? catByName.get(categoryName.toLowerCase()) : undefined;

    if (!category && categoryName && options.createMissingCategories) {
      const type = slug(String(row.type ?? "")) === "income" ? "income" : "expense";
      if (!newCategoryNames.has(categoryName.toLowerCase())) {
        newCategoryNames.add(categoryName.toLowerCase());
        newCategories.push({ name: categoryName, type });
      }
      category = undefined; // resolved later, once the category row is created
    } else if (!category && categoryName && !options.createMissingCategories) {
      rowErrors.push(`Unknown category "${categoryName}".`);
    }

    const pmName = String(row.paymentMethod ?? "").trim();
    let paymentMethod = pmName ? pmByName.get(pmName.toLowerCase()) : undefined;
    if (!paymentMethod) paymentMethod = options.paymentMethods.find((p) => p.id === "pm_other");

    const type = normalizeType(String(row.type ?? ""), options.categories, category?.id ?? null);

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, errors: rowErrors });
      return;
    }

    transactions.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : createId("tx"),
      date: date as string,
      description,
      amount: roundCurrency(amount),
      type,
      categoryId: category?.id ?? `__pending__${categoryName}`,
      subcategoryId: null,
      paymentMethodId: paymentMethod?.id ?? "pm_other",
      tags: String(row.tags ?? "")
        .split(/[;,]/)
        .map((t) => t.trim())
        .filter(Boolean),
      notes: String(row.notes ?? "").trim() || null,
      recurringId: null,
      source: "csv",
      dedupeHash: dedupeHashFor({ date: date as string, type, amount, categoryId: category?.id ?? categoryName, description }),
      schemaVersion: SCHEMA_VERSION,
      updatedAt: now,
    });
  });

  return { transactions, errors, newCategories, totalRows: parsed.data?.length ?? 0 };
}
