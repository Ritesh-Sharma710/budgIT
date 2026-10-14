/**
 * Optional demo data.
 *
 * This is strictly opt-in, clearly labelled (every record carries
 * `source: "demo"` or an id prefixed with `demo_`) and removable in one click
 * from Settings → Data. Nothing in this file runs on a fresh install, so a new
 * user always starts with an empty, honest dashboard.
 */

import { db } from "./db";
import type {
  CategoryBudget,
  GoalContribution,
  MonthlyBudget,
  SavingsGoal,
  Transaction,
  TransactionType,
} from "@/domain/types";
import { SCHEMA_VERSION } from "@/domain/types";
import { dedupeHashFor } from "@/domain/dedupe";
import { createId } from "@/lib/id";
import { addMonths, currentMonthKey, daysInMonth, nowISO, parseMonthKey } from "@/lib/date";
import { roundCurrency } from "@/lib/money";

/** Deterministic PRNG so the same demo data is generated every time. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Seed {
  description: string;
  categoryId: string;
  type: TransactionType;
  min: number;
  max: number;
  perMonth: number;
  paymentMethodId: string;
}

const SEEDS: Seed[] = [
  { description: "Grocery run", categoryId: "cat_groceries", type: "expense", min: 800, max: 2600, perMonth: 4, paymentMethodId: "pm_upi" },
  { description: "Dinner out", categoryId: "cat_food", type: "expense", min: 250, max: 1400, perMonth: 5, paymentMethodId: "pm_credit" },
  { description: "Cab ride", categoryId: "cat_transport", type: "expense", min: 90, max: 420, perMonth: 6, paymentMethodId: "pm_upi" },
  { description: "Fuel", categoryId: "cat_transport", type: "expense", min: 700, max: 1600, perMonth: 2, paymentMethodId: "pm_debit" },
  { description: "Pharmacy", categoryId: "cat_healthcare", type: "expense", min: 200, max: 1200, perMonth: 1, paymentMethodId: "pm_upi" },
  { description: "Clothes & shoes", categoryId: "cat_shopping", type: "expense", min: 600, max: 3200, perMonth: 1, paymentMethodId: "pm_credit" },
  { description: "Movie night", categoryId: "cat_entertainment", type: "expense", min: 300, max: 900, perMonth: 2, paymentMethodId: "pm_upi" },
  { description: "Online course", categoryId: "cat_education", type: "expense", min: 499, max: 2499, perMonth: 1, paymentMethodId: "pm_credit" },
  { description: "Household items", categoryId: "cat_household", type: "expense", min: 200, max: 1100, perMonth: 2, paymentMethodId: "pm_cash" },
  { description: "Weekend trip", categoryId: "cat_travel", type: "expense", min: 2500, max: 7500, perMonth: 1, paymentMethodId: "pm_credit" },
];

const FIXED: (Omit<Seed, "min" | "max" | "perMonth"> & { amount: number; day: number })[] = [
  { description: "Monthly salary", categoryId: "cat_salary", type: "income", paymentMethodId: "pm_bank", amount: 120000, day: 1 },
  { description: "House rent", categoryId: "cat_rent", type: "expense", paymentMethodId: "pm_bank", amount: 22000, day: 3 },
  { description: "Electricity bill", categoryId: "cat_utilities", type: "expense", paymentMethodId: "pm_upi", amount: 2100, day: 8 },
  { description: "Internet & mobile", categoryId: "cat_utilities", type: "expense", paymentMethodId: "pm_upi", amount: 1450, day: 10 },
  { description: "Streaming subscriptions", categoryId: "cat_subscriptions", type: "expense", paymentMethodId: "pm_credit", amount: 899, day: 12 },
  { description: "Freelance project", categoryId: "cat_freelance", type: "income", paymentMethodId: "pm_bank", amount: 18500, day: 20 },
  { description: "Emergency fund top-up", categoryId: "cat_emergency", type: "savings_contribution", paymentMethodId: "pm_bank", amount: 15000, day: 2 },
  { description: "Monthly SIP", categoryId: "cat_mutual_funds", type: "investment_contribution", paymentMethodId: "pm_bank", amount: 12000, day: 5 },
];

export interface DemoDataBundle {
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  categoryBudgets: CategoryBudget[];
  goals: SavingsGoal[];
  goalContributions: GoalContribution[];
}

export function buildDemoData(monthsBack = 5): DemoDataBundle {
  const random = mulberry32(20261014);
  const now = nowISO();
  const endMonth = currentMonthKey();
  const startMonth = addMonths(endMonth, -monthsBack);
  const transactions: Transaction[] = [];

  const push = (
    month: string,
    day: number,
    seed: { description: string; categoryId: string; type: TransactionType; paymentMethodId: string },
    amount: number,
  ) => {
    const { year, month: m } = parseMonthKey(month);
    const safeDay = Math.min(day, daysInMonth(year, m));
    const date = `${month}-${String(safeDay).padStart(2, "0")}`;
    const value = roundCurrency(amount);
    transactions.push({
      id: createId("tx"),
      date,
      description: seed.description,
      amount: value,
      type: seed.type,
      categoryId: seed.categoryId,
      subcategoryId: null,
      paymentMethodId: seed.paymentMethodId,
      tags: ["demo"],
      notes: null,
      recurringId: null,
      source: "demo",
      dedupeHash: dedupeHashFor({ date, type: seed.type, amount: value, categoryId: seed.categoryId, description: seed.description }),
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
  };

  for (let i = 0; i <= monthsBack; i += 1) {
    const month = addMonths(startMonth, i);
    const { year, month: m } = parseMonthKey(month);
    const totalDays = daysInMonth(year, m);

    for (const fixed of FIXED) {
      // Salary varies slightly to make year-on-year comparison meaningful.
      const jitter = fixed.type === "income" ? 1 + (random() - 0.4) * 0.08 : 1 + (random() - 0.5) * 0.15;
      push(month, fixed.day, fixed, fixed.amount * jitter);
    }

    for (const seed of SEEDS) {
      const count = seed.perMonth;
      for (let n = 0; n < count; n += 1) {
        const day = Math.max(1, Math.round(random() * (totalDays - 1)) + 1);
        const amount = seed.min + random() * (seed.max - seed.min);
        push(month, day, seed, amount);
      }
    }
  }

  // Budgets for the previous and current month, so the budget widget has data.
  const budgets: MonthlyBudget[] = [];
  const categoryBudgets: CategoryBudget[] = [];
  const budgetSpec: Record<string, number> = {
    cat_food: 6000,
    cat_groceries: 9000,
    cat_transport: 5000,
    cat_rent: 22000,
    cat_utilities: 4000,
    cat_subscriptions: 1200,
    cat_shopping: 4000,
    cat_entertainment: 2500,
    cat_healthcare: 2000,
    cat_travel: 6000,
  };

  for (const month of [addMonths(endMonth, -1), endMonth]) {
    budgets.push({
      id: `budget_${month}`,
      month,
      overallLimit: Object.values(budgetSpec).reduce((a, b) => a + b, 0),
      savingsTarget: 25000,
      notes: "Demo budget",
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
    for (const [categoryId, amount] of Object.entries(budgetSpec)) {
      categoryBudgets.push({
        id: `demo_cb_${month}_${categoryId}`,
        month,
        categoryId,
        amount,
        createdAt: now,
        updatedAt: now,
        schemaVersion: SCHEMA_VERSION,
      });
    }
  }

  // Two goals with a contribution history.
  const goals: SavingsGoal[] = [
    {
      id: "demo_goal_emergency",
      name: "Emergency fund",
      targetAmount: 300000,
      initialAmount: 40000,
      targetDate: `${parseMonthKey(addMonths(endMonth, 12)).year}-${String(parseMonthKey(addMonths(endMonth, 12)).month).padStart(2, "0")}-01`,
      icon: "ShieldCheck",
      color: "#3b82f6",
      notes: "Six months of essential expenses.",
      status: "active",
      linkedCategoryId: "cat_emergency",
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    },
    {
      id: "demo_goal_laptop",
      name: "New laptop",
      targetAmount: 150000,
      initialAmount: 10000,
      targetDate: `${parseMonthKey(addMonths(endMonth, 7)).year}-${String(parseMonthKey(addMonths(endMonth, 7)).month).padStart(2, "0")}-15`,
      icon: "Laptop",
      color: "#8b5cf6",
      notes: "Work machine upgrade.",
      status: "active",
      linkedCategoryId: "cat_goaltarget",
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    },
  ];

  const goalContributions: GoalContribution[] = [];
  for (let i = 0; i <= monthsBack; i += 1) {
    const month = addMonths(startMonth, i);
    const date = `${month}-05`;
    goalContributions.push({
      id: createId("gc"),
      goalId: "demo_goal_emergency",
      date,
      amount: i % 3 === 0 ? 20000 : 15000,
      notes: "Demo contribution",
      transactionId: null,
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
    if (i % 2 === 0) {
      goalContributions.push({
        id: createId("gc"),
        goalId: "demo_goal_laptop",
        date,
        amount: 8000,
        notes: "Demo contribution",
        transactionId: null,
        createdAt: now,
        updatedAt: now,
        schemaVersion: SCHEMA_VERSION,
      });
    }
  }

  return { transactions, budgets, categoryBudgets, goals, goalContributions };
}

export async function installDemoData(): Promise<void> {
  const bundle = buildDemoData();
  await db.transaction(
    "rw",
    [db.transactions, db.budgets, db.categoryBudgets, db.goals, db.goalContributions],
    async () => {
      await db.transactions.bulkAdd(bundle.transactions);
      await db.budgets.bulkPut(bundle.budgets);
      await db.categoryBudgets.bulkPut(bundle.categoryBudgets);
      await db.goals.bulkPut(bundle.goals);
      await db.goalContributions.bulkAdd(bundle.goalContributions);
    },
  );
}

export async function removeDemoData(): Promise<void> {
  await db.transaction(
    "rw",
    [db.transactions, db.budgets, db.categoryBudgets, db.goals, db.goalContributions, db.recurring],
    async () => {
      await db.transactions.where("source").equals("demo").delete();
      await db.goalContributions
        .filter((c) => c.goalId.startsWith("demo_") || c.notes === "Demo contribution")
        .delete();
      await db.goals.filter((g) => g.id.startsWith("demo_")).delete();
      await db.budgets.filter((b) => (b.notes ?? "").startsWith("Demo")).delete();
      await db.categoryBudgets.filter((cb) => cb.id.startsWith("demo_cb_")).delete();
    },
  );
}

export async function hasDemoData(): Promise<boolean> {
  const count = await db.transactions.where("source").equals("demo").count();
  return count > 0;
}
