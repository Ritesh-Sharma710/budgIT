import { describe, expect, it } from "vitest";
import {
  annualInsights,
  categoryTotals,
  compareMonths,
  contributionsOf,
  dailySpending,
  evaluateBudget,
  expensesOf,
  filterByMonth,
  goalProgress,
  incomeOf,
  monthSummariesForRange,
  summarizeMonth,
  summarizeYear,
  trailingMonths,
} from "./calculations";
import type { Category, CategoryBudget, GoalContribution, MonthlyBudget, SavingsGoal, Transaction, TransactionType } from "./types";
import { SCHEMA_VERSION } from "./types";

let counter = 0;

function tx(partial: Partial<Transaction> & { date: string; amount: number; type: TransactionType }): Transaction {
  counter += 1;
  return {
    id: `t${counter}`,
    description: "test",
    categoryId: "cat_food",
    subcategoryId: null,
    paymentMethodId: "pm_upi",
    tags: [],
    notes: null,
    recurringId: null,
    source: "manual",
    dedupeHash: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    schemaVersion: SCHEMA_VERSION,
    ...partial,
  };
}

const categories: Category[] = [
  { id: "cat_food", name: "Food", type: "expense", parentId: null, icon: null, color: "#f00", isSystem: true, archivedAt: null, order: 0, createdAt: "", updatedAt: "", schemaVersion: 1 },
  { id: "cat_rent", name: "Rent", type: "expense", parentId: null, icon: null, color: "#0f0", isSystem: true, archivedAt: null, order: 1, createdAt: "", updatedAt: "", schemaVersion: 1 },
  { id: "cat_salary", name: "Salary", type: "income", parentId: null, icon: null, color: "#00f", isSystem: true, archivedAt: null, order: 2, createdAt: "", updatedAt: "", schemaVersion: 1 },
];

describe("monthly aggregation", () => {
  const txs = [
    tx({ date: "2026-03-01", amount: 100000, type: "income", categoryId: "cat_salary" }),
    tx({ date: "2026-03-05", amount: 20000, type: "expense", categoryId: "cat_rent" }),
    tx({ date: "2026-03-10", amount: 5000, type: "expense", categoryId: "cat_food" }),
    tx({ date: "2026-03-15", amount: 15000, type: "savings_contribution" }),
    tx({ date: "2026-03-20", amount: 10000, type: "investment_contribution" }),
    tx({ date: "2026-03-25", amount: 8000, type: "transfer" }),
    // Different month — must not leak in.
    tx({ date: "2026-04-01", amount: 99999, type: "expense" }),
  ];

  it("totals income, expenses and net savings for the month only", () => {
    const summary = summarizeMonth(txs, "2026-03");
    expect(summary.income).toBe(100000);
    expect(summary.expenses).toBe(25000);
    expect(summary.netSavings).toBe(75000);
    expect(summary.transactionCount).toBe(6);
  });

  it("keeps savings and investment contributions out of expenses by default", () => {
    const summary = summarizeMonth(txs, "2026-03");
    expect(summary.savingsContributions).toBe(15000);
    expect(summary.investmentContributions).toBe(10000);
    expect(summary.transfers).toBe(8000);
    expect(summary.expenses).toBe(25000);
  });

  it("can optionally fold contributions into expenses", () => {
    expect(expensesOf(filterByMonth(txs, "2026-03"), { countContributionsAsExpenses: true })).toBe(50000);
  });

  it("never counts transfers as income or expenses", () => {
    expect(incomeOf(txs)).toBe(100000);
    expect(expensesOf(filterByMonth(txs, "2026-03"))).toBe(25000);
    expect(contributionsOf(txs, "savings")).toBe(15000);
  });

  it("computes savings rate as a percentage of income", () => {
    const summary = summarizeMonth(txs, "2026-03");
    expect(summary.savingsRate).toBeCloseTo(75, 5);
  });

  it("returns a null-equivalent rate when there is no income", () => {
    const noIncome = [tx({ date: "2026-03-05", amount: 2000, type: "expense" })];
    const summary = summarizeMonth(noIncome, "2026-03");
    expect(summary.income).toBe(0);
    expect(summary.savingsRate).toBe(0);
    expect(summary.netSavings).toBe(-2000);
  });

  it("supports negative net savings", () => {
    const overspend = [
      tx({ date: "2026-03-02", amount: 10000, type: "income", categoryId: "cat_salary" }),
      tx({ date: "2026-03-03", amount: 14000, type: "expense" }),
    ];
    const summary = summarizeMonth(overspend, "2026-03");
    expect(summary.netSavings).toBe(-4000);
    expect(summary.savingsRate).toBeCloseTo(-40, 5);
  });
});

describe("month and year boundaries", () => {
  const txs = [
    tx({ date: "2025-12-31", amount: 1000, type: "expense" }),
    tx({ date: "2026-01-01", amount: 2000, type: "expense" }),
    tx({ date: "2026-02-28", amount: 3000, type: "expense" }),
    tx({ date: "2026-03-01", amount: 4000, type: "expense" }),
  ];

  it("splits December and January into the right years", () => {
    expect(summarizeYear(txs, 2025).expenses).toBe(1000);
    expect(summarizeYear(txs, 2026).expenses).toBe(9000);
  });

  it("handles leap years without shifting February", () => {
    const leap = [tx({ date: "2028-02-29", amount: 500, type: "expense" })];
    expect(summarizeMonth(leap, "2028-02").expenses).toBe(500);
  });

  it("counts active months instead of assuming empty months are zero-spend", () => {
    const summary = summarizeYear(txs, 2026);
    expect(summary.months).toHaveLength(12);
    expect(summary.activeMonths).toBe(3);
  });

  it("builds a contiguous month series across a year boundary", () => {
    const series = monthSummariesForRange(txs, "2025-11", "2026-02");
    expect(series.map((m) => m.month)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(series[0].expenses).toBe(0);
    expect(series[3].expenses).toBe(3000);
  });

  it("returns the trailing window ending at the selected month", () => {
    const series = trailingMonths(txs, "2026-03", 3);
    expect(series.map((m) => m.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });
});

describe("annual reporting", () => {
  const txs = [
    tx({ date: "2026-01-10", amount: 120000, type: "income", categoryId: "cat_salary" }),
    tx({ date: "2026-02-10", amount: 120000, type: "income", categoryId: "cat_salary" }),
    tx({ date: "2026-01-15", amount: 30000, type: "expense", categoryId: "cat_rent" }),
    tx({ date: "2026-02-15", amount: 45000, type: "expense", categoryId: "cat_rent" }),
    tx({ date: "2026-02-20", amount: 5000, type: "expense", categoryId: "cat_food" }),
  ];

  it("aggregates the year and averages over active months only", () => {
    const insights = annualInsights(txs, categories, 2026);
    expect(insights.summary.income).toBe(240000);
    expect(insights.summary.expenses).toBe(80000);
    expect(insights.summary.netSavings).toBe(160000);
    expect(insights.averageMonthlyIncome).toBe(120000);
    expect(insights.averageMonthlyExpenses).toBe(40000);
  });

  it("finds the highest and lowest spending months", () => {
    const insights = annualInsights(txs, categories, 2026);
    expect(insights.highestMonth?.month).toBe("2026-02");
    expect(insights.lowestMonth?.month).toBe("2026-01");
  });

  it("omits a previous-year comparison when there is no comparable data", () => {
    const insights = annualInsights(txs, categories, 2026);
    expect(insights.previousYear).toBeNull();
  });
});

describe("category analysis", () => {
  it("sorts categories by spend and computes shares", () => {
    const txs = [
      tx({ date: "2026-03-01", amount: 3000, type: "expense", categoryId: "cat_food" }),
      tx({ date: "2026-03-02", amount: 9000, type: "expense", categoryId: "cat_rent" }),
      tx({ date: "2026-03-03", amount: 100000, type: "income", categoryId: "cat_salary" }),
    ];
    const totals = categoryTotals(txs, categories, { type: "expense" });
    expect(totals.map((t) => t.name)).toEqual(["Rent", "Food"]);
    expect(totals[0].share).toBeCloseTo(75, 5);
    expect(totals[0].transactionCount).toBe(1);
  });

  it("labels transactions whose category disappeared as Uncategorised", () => {
    const txs = [tx({ date: "2026-03-01", amount: 500, type: "expense", categoryId: "cat_deleted" })];
    expect(categoryTotals(txs, categories)[0].name).toBe("Uncategorised");
  });
});

describe("budget evaluation", () => {
  const budget: MonthlyBudget = {
    id: "b1",
    month: "2026-03",
    overallLimit: 30000,
    savingsTarget: 20000,
    notes: null,
    createdAt: "",
    updatedAt: "",
    schemaVersion: 1,
  };
  const lines: CategoryBudget[] = [
    { id: "cb1", month: "2026-03", categoryId: "cat_food", amount: 10000, createdAt: "", updatedAt: "", schemaVersion: 1 },
    { id: "cb2", month: "2026-03", categoryId: "cat_rent", amount: 20000, createdAt: "", updatedAt: "", schemaVersion: 1 },
  ];

  it("flags thresholds at 75/90/100 percent", () => {
    const evaluation = evaluateBudget(
      [
        tx({ date: "2026-03-01", amount: 9000, type: "expense", categoryId: "cat_food" }), // 90% → critical
        tx({ date: "2026-03-02", amount: 15000, type: "expense", categoryId: "cat_rent" }), // 75% → warning
      ],
      categories,
      lines,
      budget,
      "2026-03",
      [75, 90, 100],
    );

    const food = evaluation.lines.find((l) => l.categoryId === "cat_food");
    const rent = evaluation.lines.find((l) => l.categoryId === "cat_rent");
    expect(food?.status).toBe("critical");
    expect(rent?.status).toBe("warning");
    expect(food?.remaining).toBe(1000);
  });

  it("marks a category as exceeded above 100 percent", () => {
    const evaluation = evaluateBudget(
      [tx({ date: "2026-03-01", amount: 12000, type: "expense", categoryId: "cat_food" })],
      categories,
      lines,
      budget,
      "2026-03",
    );
    const food = evaluation.lines.find((l) => l.categoryId === "cat_food");
    expect(food?.status).toBe("exceeded");
    expect(food?.remaining).toBe(-2000);
  });

  it("never treats an unbudgeted category as a zero budget", () => {
    const evaluation = evaluateBudget(
      [tx({ date: "2026-03-01", amount: 900, type: "expense", categoryId: "cat_food" })],
      categories,
      [],
      null,
      "2026-03",
    );
    const food = evaluation.lines.find((l) => l.categoryId === "cat_food");
    expect(food?.budgeted).toBe(0);
    expect(food?.status).toBe("none");
    expect(evaluation.overallUtilization).toBeNull();
  });

  it("computes overall remaining from the explicit limit", () => {
    const evaluation = evaluateBudget(
      [tx({ date: "2026-03-01", amount: 5000, type: "expense", categoryId: "cat_rent" })],
      categories,
      lines,
      budget,
      "2026-03",
    );
    expect(evaluation.totalSpent).toBe(5000);
    expect(evaluation.overallRemaining).toBe(25000);
  });
});

describe("savings goals", () => {
  const baseGoal: SavingsGoal = {
    id: "g1",
    name: "Emergency fund",
    targetAmount: 100000,
    initialAmount: 10000,
    targetDate: "2026-12-31",
    icon: null,
    color: null,
    notes: null,
    status: "active",
    linkedCategoryId: null,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    schemaVersion: 1,
  };

  const contributions: GoalContribution[] = [
    { id: "c1", goalId: "g1", date: "2026-02-01", amount: 20000, notes: null, transactionId: null, createdAt: "", updatedAt: "", schemaVersion: 1 },
    { id: "c2", goalId: "g1", date: "2026-03-01", amount: 15000, notes: null, transactionId: null, createdAt: "", updatedAt: "", schemaVersion: 1 },
  ];

  it("adds contributions to the opening balance", () => {
    const progress = goalProgress(baseGoal, contributions, "2026-06-30");
    expect(progress.saved).toBe(45000);
    expect(progress.remaining).toBe(55000);
    expect(progress.progress).toBeCloseTo(45, 5);
  });

  it("estimates the required monthly contribution from the target date", () => {
    const progress = goalProgress(baseGoal, contributions, "2026-06-30");
    expect(progress.monthsRemaining).toBe(6);
    expect(progress.requiredMonthly).toBeCloseTo(9166.67, 1);
  });

  it("handles withdrawals (negative contributions)", () => {
    const withWithdrawal: GoalContribution[] = [
      ...contributions,
      { id: "c3", goalId: "g1", date: "2026-04-01", amount: -5000, notes: null, transactionId: null, createdAt: "", updatedAt: "", schemaVersion: 1 },
    ];
    expect(goalProgress(baseGoal, withWithdrawal, "2026-06-30").saved).toBe(40000);
  });

  it("marks a funded goal as completed", () => {
    const funded: SavingsGoal = { ...baseGoal, targetAmount: 30000 };
    expect(goalProgress(funded, contributions, "2026-06-30").status).toBe("completed");
  });

  it("flags a passed target date as overdue", () => {
    const progress = goalProgress({ ...baseGoal, targetAmount: 500000 }, contributions, "2027-06-30");
    expect(progress.status).toBe("overdue");
  });
});

describe("daily spending series", () => {
  it("produces one point per day including zero-spend days", () => {
    const series = dailySpending(
      [
        tx({ date: "2026-02-01", amount: 100, type: "expense" }),
        tx({ date: "2026-02-01", amount: 50, type: "expense" }),
        tx({ date: "2026-02-28", amount: 200, type: "expense" }),
      ],
      "2026-02",
    );
    expect(series).toHaveLength(28);
    expect(series[0].amount).toBe(150);
    expect(series[27].amount).toBe(200);
    expect(series[27].cumulative).toBe(350);
    expect(series[10].amount).toBe(0);
  });
});

describe("month-over-month comparison", () => {
  it("computes percentage changes and protects against divide-by-zero", () => {
    const txs = [
      tx({ date: "2026-02-10", amount: 50000, type: "income", categoryId: "cat_salary" }),
      tx({ date: "2026-02-11", amount: 20000, type: "expense" }),
      tx({ date: "2026-03-10", amount: 60000, type: "income", categoryId: "cat_salary" }),
      tx({ date: "2026-03-11", amount: 25000, type: "expense" }),
    ];
    const comparison = compareMonths(txs, "2026-03");
    expect(comparison.incomeChange).toBeCloseTo(20, 5);
    expect(comparison.expenseChange).toBeCloseTo(25, 5);
    expect(comparison.netSavingsChange).toBe(5000);
  });

  it("returns null change when the previous month had no income", () => {
    const txs = [tx({ date: "2026-03-10", amount: 60000, type: "income", categoryId: "cat_salary" })];
    expect(compareMonths(txs, "2026-03").incomeChange).toBeNull();
  });
});
