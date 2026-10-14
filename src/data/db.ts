import Dexie, { type Table } from "dexie";
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

/**
 * IndexedDB schema (local-first mode).
 *
 * We index only real columns — `date` is used for month filtering via
 * `where("date").between(start, end)` so there is no redundant `month` column
 * that could drift out of sync. The schema is declared once and versioned so
 * future migrations stay additive.
 */
export class BudgitDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  paymentMethods!: Table<PaymentMethod, string>;
  budgets!: Table<MonthlyBudget, string>;
  categoryBudgets!: Table<CategoryBudget, string>;
  goals!: Table<SavingsGoal, string>;
  goalContributions!: Table<GoalContribution, string>;
  recurring!: Table<RecurringRule, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("budgit");
    this.version(1).stores({
      transactions:
        "id, date, type, categoryId, paymentMethodId, recurringId, dedupeHash, source, updatedAt, *tags",
      categories: "id, type, parentId, order, archivedAt",
      paymentMethods: "id, name, archivedAt",
      budgets: "id, &month",
      categoryBudgets: "id, month, categoryId, &[month+categoryId]",
      goals: "id, status, targetDate",
      goalContributions: "id, goalId, date",
      recurring: "id, active, anchor",
      settings: "id",
    });
  }
}

export const db = new BudgitDatabase();

export const TABLES = [
  "transactions",
  "categories",
  "paymentMethods",
  "budgets",
  "categoryBudgets",
  "goals",
  "goalContributions",
  "recurring",
  "settings",
] as const;

export type TableName = (typeof TABLES)[number];

/** Wipe everything (used by "erase local data" and by backup restore). */
export async function resetDatabase(): Promise<void> {
  await Promise.all(TABLES.map((name) => db.table(name).clear()));
}
