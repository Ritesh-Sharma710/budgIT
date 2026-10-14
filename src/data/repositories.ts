/**
 * Repository layer — the only place that talks to IndexedDB.
 *
 * UI components and hooks never touch Dexie tables directly, which keeps the
 * persistence concern isolated and makes a future Google Sheets adapter a
 * drop-in replacement behind the same vocabulary.
 */

import { db } from "./db";
import { defaultSettings, seedCategories, seedPaymentMethods } from "./defaults";
import type {
  AppSettings,
  Category,
  CategoryBudget,
  GoalContribution,
  MonthlyBudget,
  PaymentMethod,
  RecurringRule,
  SavingsGoal,
  Transaction,
} from "@/domain/types";
import { SCHEMA_VERSION } from "@/domain/types";
import { dedupeHashFor } from "@/domain/dedupe";
import { nowISO, monthStart, monthEnd, toMonthKey, todayISO } from "@/lib/date";
import { createId } from "@/lib/id";
import { roundCurrency } from "@/lib/money";

/* -------------------------------------------------------------------------- */
/* Transactions                                                                 */
/* -------------------------------------------------------------------------- */

export const transactionsRepo = {
  async all(): Promise<Transaction[]> {
    return db.transactions.orderBy("date").reverse().toArray();
  },

  async byMonth(month: string): Promise<Transaction[]> {
    return db.transactions
      .where("date")
      .between(monthStart(month), monthEnd(month), true, true)
      .reverse()
      .sortBy("date");
  },

  async byRange(start: string, end: string): Promise<Transaction[]> {
    return db.transactions.where("date").between(start, end, true, true).sortBy("date");
  },

  async byId(id: string): Promise<Transaction | undefined> {
    return db.transactions.get(id);
  },

  async create(input: Omit<Transaction, "id" | "createdAt" | "updatedAt" | "schemaVersion" | "dedupeHash">): Promise<Transaction> {
    const now = nowISO();
    const record: Transaction = {
      ...input,
      id: createId("tx"),
      dedupeHash: dedupeHashFor(input),
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    };
    await db.transactions.add(record);
    return record;
  },

  async update(id: string, patch: Partial<Transaction>): Promise<Transaction | undefined> {
    const existing = await db.transactions.get(id);
    if (!existing) return undefined;
    const merged: Transaction = {
      ...existing,
      ...patch,
      id,
      updatedAt: nowISO(),
      schemaVersion: SCHEMA_VERSION,
    };
    merged.dedupeHash = dedupeHashFor(merged);
    await db.transactions.put(merged);
    return merged;
  },

  async remove(id: string): Promise<void> {
    await db.transactions.delete(id);
  },

  async removeMany(ids: string[]): Promise<void> {
    await db.transactions.bulkDelete(ids);
  },

  async bulkUpsert(records: Transaction[]): Promise<void> {
    await db.transactions.bulkPut(records);
  },

  async existingHashes(): Promise<Set<string>> {
    const hashes = await db.transactions.orderBy("dedupeHash").uniqueKeys();
    return new Set(hashes.filter((h): h is string => typeof h === "string" && h.length > 0));
  },

  async count(): Promise<number> {
    return db.transactions.count();
  },
};

/* -------------------------------------------------------------------------- */
/* Categories                                                                   */
/* -------------------------------------------------------------------------- */

export const categoriesRepo = {
  async all(): Promise<Category[]> {
    return db.categories.orderBy("order").toArray();
  },

  async active(): Promise<Category[]> {
    const all = await db.categories.orderBy("order").toArray();
    return all.filter((c) => !c.archivedAt);
  },

  async create(input: Pick<Category, "name" | "type"> & Partial<Category>): Promise<Category> {
    const now = nowISO();
    const count = await db.categories.count();
    const record: Category = {
      id: input.id ?? createId("cat"),
      name: input.name.trim(),
      type: input.type,
      parentId: input.parentId ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      isSystem: input.isSystem ?? false,
      archivedAt: null,
      order: input.order ?? count,
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    };
    await db.categories.add(record);
    return record;
  },

  async update(id: string, patch: Partial<Category>): Promise<void> {
    await db.categories.update(id, { ...patch, updatedAt: nowISO() });
  },

  /**
   * Categories are never hard-deleted when transactions reference them, so
   * historical records keep a valid label. Unused custom categories can be
   * removed outright.
   */
  async removeOrArchive(id: string): Promise<"deleted" | "archived"> {
    const usage = await db.transactions.where("categoryId").equals(id).count();
    if (usage > 0) {
      await db.categories.update(id, { archivedAt: nowISO(), updatedAt: nowISO() });
      return "archived";
    }
    await db.categories.delete(id);
    return "deleted";
  },

  async bulkUpsert(records: Category[]): Promise<void> {
    await db.categories.bulkPut(records);
  },
};

/* -------------------------------------------------------------------------- */
/* Payment methods                                                              */
/* -------------------------------------------------------------------------- */

export const paymentMethodsRepo = {
  async all(): Promise<PaymentMethod[]> {
    return db.paymentMethods.toArray();
  },

  async create(input: Pick<PaymentMethod, "name">): Promise<PaymentMethod> {
    const now = nowISO();
    const record: PaymentMethod = {
      id: createId("pm"),
      name: input.name.trim(),
      isSystem: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    };
    await db.paymentMethods.add(record);
    return record;
  },

  async update(id: string, patch: Partial<PaymentMethod>): Promise<void> {
    await db.paymentMethods.update(id, { ...patch, updatedAt: nowISO() });
  },

  async removeOrArchive(id: string): Promise<"deleted" | "archived"> {
    const usage = await db.transactions.where("paymentMethodId").equals(id).count();
    if (usage > 0) {
      await db.paymentMethods.update(id, { archivedAt: nowISO(), updatedAt: nowISO() });
      return "archived";
    }
    await db.paymentMethods.delete(id);
    return "deleted";
  },

  async bulkUpsert(records: PaymentMethod[]): Promise<void> {
    await db.paymentMethods.bulkPut(records);
  },
};

/* -------------------------------------------------------------------------- */
/* Budgets                                                                      */
/* -------------------------------------------------------------------------- */

export const budgetsRepo = {
  async byMonth(month: string): Promise<MonthlyBudget | undefined> {
    return db.budgets.where("month").equals(month).first();
  },

  async all(): Promise<MonthlyBudget[]> {
    return db.budgets.toArray();
  },

  async upsert(budget: MonthlyBudget): Promise<void> {
    await db.budgets.put(budget);
  },

  async remove(id: string): Promise<void> {
    await db.budgets.delete(id);
  },

  async copyMonth(fromMonth: string, toMonth: string): Promise<void> {
    const now = nowISO();
    const source = await db.budgets.where("month").equals(fromMonth).first();
    if (source) {
      await db.budgets.put({
        ...source,
        id: `budget_${toMonth}`,
        month: toMonth,
        createdAt: now,
        updatedAt: now,
      });
    }
    const lines = await db.categoryBudgets.where("month").equals(fromMonth).toArray();
    const clones: CategoryBudget[] = lines.map((line) => ({
      ...line,
      id: `cb_${toMonth}_${line.categoryId}`,
      month: toMonth,
      createdAt: now,
      updatedAt: now,
    }));
    if (clones.length) await db.categoryBudgets.bulkPut(clones);
  },
};

export const categoryBudgetsRepo = {
  async byMonth(month: string): Promise<CategoryBudget[]> {
    return db.categoryBudgets.where("month").equals(month).toArray();
  },

  async all(): Promise<CategoryBudget[]> {
    return db.categoryBudgets.toArray();
  },

  async setAmount(month: string, categoryId: string, amount: number): Promise<void> {
    const now = nowISO();
    const id = `cb_${month}_${categoryId}`;
    const rounded = roundCurrency(amount);
    if (rounded <= 0) {
      await db.categoryBudgets.delete(id);
      return;
    }
    const existing = await db.categoryBudgets.get(id);
    await db.categoryBudgets.put({
      id,
      month,
      categoryId,
      amount: rounded,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
  },

  async bulkUpsert(records: CategoryBudget[]): Promise<void> {
    await db.categoryBudgets.bulkPut(records);
  },
};

/* -------------------------------------------------------------------------- */
/* Savings goals                                                                */
/* -------------------------------------------------------------------------- */

export const goalsRepo = {
  async all(): Promise<SavingsGoal[]> {
    return db.goals.toArray();
  },

  async active(): Promise<SavingsGoal[]> {
    const all = await db.goals.toArray();
    return all.filter((g) => g.status !== "archived");
  },

  async create(input: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt" | "schemaVersion">): Promise<SavingsGoal> {
    const now = nowISO();
    const record: SavingsGoal = {
      ...input,
      id: createId("goal"),
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    };
    await db.goals.add(record);
    return record;
  },

  async update(id: string, patch: Partial<SavingsGoal>): Promise<void> {
    await db.goals.update(id, { ...patch, updatedAt: nowISO() });
  },

  async remove(id: string): Promise<void> {
    await db.transaction("rw", db.goals, db.goalContributions, async () => {
      await db.goalContributions.where("goalId").equals(id).delete();
      await db.goals.delete(id);
    });
  },

  async bulkUpsert(records: SavingsGoal[]): Promise<void> {
    await db.goals.bulkPut(records);
  },
};

export const goalContributionsRepo = {
  async all(): Promise<GoalContribution[]> {
    return db.goalContributions.toArray();
  },

  async byGoal(goalId: string): Promise<GoalContribution[]> {
    return db.goalContributions.where("goalId").equals(goalId).sortBy("date");
  },

  async create(input: Omit<GoalContribution, "id" | "createdAt" | "updatedAt" | "schemaVersion">): Promise<GoalContribution> {
    const now = nowISO();
    const record: GoalContribution = {
      ...input,
      id: createId("gc"),
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    };
    await db.goalContributions.add(record);
    return record;
  },

  async remove(id: string): Promise<void> {
    await db.goalContributions.delete(id);
  },

  async bulkUpsert(records: GoalContribution[]): Promise<void> {
    await db.goalContributions.bulkPut(records);
  },
};

/* -------------------------------------------------------------------------- */
/* Recurring rules                                                              */
/* -------------------------------------------------------------------------- */

export const recurringRepo = {
  async all(): Promise<RecurringRule[]> {
    return db.recurring.toArray();
  },

  async create(input: Omit<RecurringRule, "id" | "createdAt" | "updatedAt" | "schemaVersion">): Promise<RecurringRule> {
    const now = nowISO();
    const record: RecurringRule = {
      ...input,
      id: createId("rec"),
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    };
    await db.recurring.add(record);
    return record;
  },

  async update(id: string, patch: Partial<RecurringRule>): Promise<void> {
    await db.recurring.update(id, { ...patch, updatedAt: nowISO() });
  },

  async remove(id: string): Promise<void> {
    await db.recurring.delete(id);
  },

  async bulkUpsert(records: RecurringRule[]): Promise<void> {
    await db.recurring.bulkPut(records);
  },

  /**
   * Materialise due recurring rules for a month idempotently. Each generated
   * transaction carries the rule id, so re-running never duplicates records.
   */
  async generateForMonth(month: string): Promise<number> {
    const rules = await db.recurring.toArray();
    const generated: Transaction[] = [];

    for (const rule of rules) {
      if (!rule.active) continue;
      if (toMonthKey(rule.startDate) > month) continue;
      if (rule.endDate && toMonthKey(rule.endDate) < month) continue;
      if (rule.lastRunMonth === month) continue;

      const day = String(Math.min(Math.max(rule.anchor, 1), 28)).padStart(2, "0");
      const date = `${month}-${day}`;
      if (date < rule.startDate) continue;
      if (rule.endDate && date > rule.endDate) continue;

      const already = await db.transactions.where("recurringId").equals(rule.id).toArray();
      if (already.some((t) => toMonthKey(t.date) === month)) continue;

      const now = nowISO();
      generated.push({
        id: createId("tx"),
        date,
        description: rule.description,
        amount: rule.amount,
        type: rule.type,
        categoryId: rule.categoryId,
        subcategoryId: null,
        paymentMethodId: rule.paymentMethodId,
        tags: ["recurring"],
        notes: rule.notes ?? null,
        recurringId: rule.id,
        source: "recurring",
        dedupeHash: dedupeHashFor({
          date,
          type: rule.type,
          amount: rule.amount,
          categoryId: rule.categoryId,
          description: rule.description,
        }),
        createdAt: now,
        updatedAt: now,
        schemaVersion: SCHEMA_VERSION,
      });

      await db.recurring.update(rule.id, { lastRunMonth: month, updatedAt: now });
    }

    if (generated.length) await db.transactions.bulkAdd(generated);
    return generated.length;
  },
};

/* -------------------------------------------------------------------------- */
/* Settings                                                                     */
/* -------------------------------------------------------------------------- */

export const settingsRepo = {
  async get(): Promise<AppSettings> {
    const found = await db.settings.get("app");
    if (found) return found;
    const created = defaultSettings();
    await db.settings.put(created);
    return created;
  },

  async patch(patch: Partial<AppSettings>): Promise<AppSettings> {
    const current = await settingsRepo.get();
    const next: AppSettings = { ...current, ...patch, id: "app", updatedAt: nowISO() };
    await db.settings.put(next);
    return next;
  },

  async put(settings: AppSettings): Promise<void> {
    await db.settings.put(settings);
  },
};

/* -------------------------------------------------------------------------- */
/* Bootstrap                                                                    */
/* -------------------------------------------------------------------------- */

/** Ensure seeded reference data + settings exist. Safe to call repeatedly. */
export async function ensureSeeded(): Promise<void> {
  await db.transaction("rw", db.categories, db.paymentMethods, db.settings, async () => {
    const categoryCount = await db.categories.count();
    if (categoryCount === 0) await db.categories.bulkAdd(seedCategories());

    const methodCount = await db.paymentMethods.count();
    if (methodCount === 0) await db.paymentMethods.bulkAdd(seedPaymentMethods());

    const settings = await db.settings.get("app");
    if (!settings) await db.settings.put(defaultSettings());
  });
}

export function todayMonth(): string {
  return toMonthKey(todayISO());
}
