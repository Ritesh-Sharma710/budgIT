/**
 * Validation rules shared by forms, CSV import and backup restore.
 * Each validator returns a list of human-readable problems so the UI can show
 * field-level errors instead of failing silently.
 */

import type {
  Category,
  GoalContribution,
  ISODate,
  MonthlyBudget,
  SavingsGoal,
  Transaction,
  TransactionType,
} from "./types";
import { TRANSACTION_TYPES, SCHEMA_VERSION } from "./types";
import { isValidISODate } from "@/lib/date";
import { parseAmount, roundCurrency } from "@/lib/money";

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

const MAX_AMOUNT = 1_000_000_000; // 100 crore — guards against fat-finger entries.

export interface TransactionInput {
  date: string;
  description: string;
  amount: number | string;
  type: TransactionType;
  categoryId: string;
  paymentMethodId: string;
  subcategoryId?: string | null;
  notes?: string | null;
  tags?: string[];
}

export function validateTransaction(input: TransactionInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.date) errors.date = "Date is required.";
  else if (!isValidISODate(input.date)) errors.date = "Enter a valid date (YYYY-MM-DD).";

  const amount = parseAmount(input.amount);
  if (!Number.isFinite(amount) || amount === 0) errors.amount = "Enter an amount greater than 0.";
  else if (Math.abs(amount) < 0) errors.amount = "Amount must be positive.";
  else if (Math.abs(amount) > MAX_AMOUNT) errors.amount = "Amount looks unrealistically large.";

  if (!input.description?.trim()) errors.description = "Add a short description.";
  else if (input.description.length > 200) errors.description = "Keep the description under 200 characters.";

  if (!TRANSACTION_TYPES.includes(input.type)) errors.type = "Choose a transaction type.";
  if (!input.categoryId) errors.categoryId = "Choose a category.";
  if (!input.paymentMethodId) errors.paymentMethodId = "Choose a payment method.";

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateBudget(input: {
  overallLimit?: number | string | null;
  savingsTarget?: number | string | null;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (input.overallLimit !== null && input.overallLimit !== undefined && input.overallLimit !== "") {
    const v = parseAmount(input.overallLimit);
    if (v < 0) errors.overallLimit = "Budget cannot be negative.";
    else if (v > MAX_AMOUNT) errors.overallLimit = "Budget looks unrealistically large.";
  }
  if (input.savingsTarget !== null && input.savingsTarget !== undefined && input.savingsTarget !== "") {
    const v = parseAmount(input.savingsTarget);
    if (v < 0) errors.savingsTarget = "Savings target cannot be negative.";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateGoal(input: {
  name: string;
  targetAmount: number | string;
  targetDate?: string | null;
  initialAmount?: number | string | null;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.name?.trim()) errors.name = "Give the goal a name.";
  const target = parseAmount(input.targetAmount);
  if (target <= 0) errors.targetAmount = "Target amount must be greater than 0.";
  if (input.targetDate && !isValidISODate(input.targetDate)) errors.targetDate = "Enter a valid target date.";
  if (input.initialAmount !== undefined && input.initialAmount !== null && input.initialAmount !== "") {
    if (parseAmount(input.initialAmount) < 0) errors.initialAmount = "Starting amount cannot be negative.";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateCategoryName(name: string, existing: Category[], ignoreId?: string): ValidationResult {
  const errors: Record<string, string> = {};
  const trimmed = name.trim();
  if (!trimmed) errors.name = "Category name is required.";
  else if (trimmed.length > 40) errors.name = "Keep the name under 40 characters.";
  else {
    const clash = existing.some(
      (c) => c.id !== ignoreId && c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (clash) errors.name = "A category with this name already exists.";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/* -------------------------------------------------------------------------- */
/* Runtime shape guards for imported / restored data                            */
/* -------------------------------------------------------------------------- */

export function isTransactionLike(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    isValidISODate(v.date) &&
    typeof v.amount === "number" &&
    typeof v.type === "string" &&
    TRANSACTION_TYPES.includes(v.type as TransactionType)
  );
}

export function normalizeTransactionInput(input: TransactionInput, base?: Partial<Transaction>): Transaction {
  const now = new Date().toISOString();
  return {
    id: base?.id ?? "",
    date: input.date,
    description: input.description.trim(),
    amount: roundCurrency(Math.abs(parseAmount(input.amount))),
    type: input.type,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId ?? null,
    paymentMethodId: input.paymentMethodId,
    tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean),
    notes: input.notes?.trim() || null,
    recurringId: base?.recurringId ?? null,
    source: base?.source ?? "manual",
    dedupeHash: base?.dedupeHash ?? null,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
}

export interface GoalContributionInput {
  goalId: string;
  date: ISODate;
  amount: number | string;
  notes?: string | null;
}

export function validateContribution(input: GoalContributionInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.goalId) errors.goalId = "Choose a goal.";
  if (!isValidISODate(input.date)) errors.date = "Enter a valid date.";
  const amount = parseAmount(input.amount);
  if (amount === 0) errors.amount = "Enter a non-zero amount. Use a negative value to withdraw.";
  return { ok: Object.keys(errors).length === 0, errors };
}

export function normalizeContribution(
  input: GoalContributionInput,
  base?: Partial<GoalContribution>,
): GoalContribution {
  const now = new Date().toISOString();
  return {
    id: base?.id ?? "",
    goalId: input.goalId,
    date: input.date,
    amount: roundCurrency(parseAmount(input.amount)),
    notes: input.notes?.trim() || null,
    transactionId: base?.transactionId ?? null,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function normalizeBudget(
  month: string,
  input: { overallLimit: number | string | null; savingsTarget: number | string | null; notes?: string | null },
  base?: Partial<MonthlyBudget>,
): MonthlyBudget {
  const now = new Date().toISOString();
  const limit = input.overallLimit === null || input.overallLimit === "" ? null : roundCurrency(parseAmount(input.overallLimit));
  const target = input.savingsTarget === null || input.savingsTarget === "" ? null : roundCurrency(parseAmount(input.savingsTarget));
  return {
    id: base?.id ?? `budget_${month}`,
    month,
    overallLimit: limit,
    savingsTarget: target,
    notes: input.notes?.trim() || null,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function normalizeGoal(
  input: {
    name: string;
    targetAmount: number | string;
    targetDate?: string | null;
    initialAmount?: number | string | null;
    icon?: string | null;
    color?: string | null;
    notes?: string | null;
    linkedCategoryId?: string | null;
    status?: SavingsGoal["status"];
  },
  base?: Partial<SavingsGoal>,
): SavingsGoal {
  const now = new Date().toISOString();
  return {
    id: base?.id ?? "",
    name: input.name.trim(),
    targetAmount: roundCurrency(parseAmount(input.targetAmount)),
    initialAmount: roundCurrency(parseAmount(input.initialAmount ?? 0)),
    targetDate: input.targetDate || null,
    icon: input.icon ?? base?.icon ?? "Target",
    color: input.color ?? base?.color ?? null,
    notes: input.notes?.trim() || null,
    status: input.status ?? base?.status ?? "active",
    linkedCategoryId: input.linkedCategoryId ?? null,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
}
