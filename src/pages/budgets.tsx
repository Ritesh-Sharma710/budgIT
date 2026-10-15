import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Edit3, SlidersHorizontal, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/dashboard/stat-card";
import { evaluateBudget } from "@/domain/calculations";
import { budgetsRepo, categoryBudgetsRepo } from "@/data/repositories";
import { useCategories, useCategoryBudgets, useMonthlyBudget, useSettings, useTransactions } from "@/state/hooks";
import { useFormat } from "@/state/format";
import { useUIStore } from "@/state/ui";
import { addMonths, monthLabel, nowISO } from "@/lib/date";
import { parseAmount } from "@/lib/money";

export function BudgetsPage() {
  const fmt = useFormat();
  const settings = useSettings();
  const month = useUIStore((s) => s.selectedMonth);
  const transactions = useTransactions();
  const categories = useCategories();
  const monthlyBudget = useMonthlyBudget(month);
  const categoryBudgets = useCategoryBudgets(month);

  const [editOverallOpen, setEditOverallOpen] = useState(false);
  const [overallLimitStr, setOverallLimitStr] = useState("");
  const [savingsTargetStr, setSavingsTargetStr] = useState("");

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<{ id: string; name: string; current: number } | null>(null);
  const [categoryLimitStr, setCategoryLimitStr] = useState("");
  const [search, setSearch] = useState("");

  const evaluation = useMemo(() => {
    return evaluateBudget(
      transactions,
      categories,
      categoryBudgets,
      monthlyBudget ?? null,
      month,
      settings.budgetThresholds,
    );
  }, [transactions, categories, categoryBudgets, monthlyBudget, month, settings.budgetThresholds]);

  const expenseCategories = useMemo(() => {
    return categories.filter((c) => c.type === "expense");
  }, [categories]);

  // Combine evaluation lines with all active expense categories so user can set budget for any
  const categoryRows = useMemo(() => {
    const evalMap = new Map(evaluation.lines.map((l) => [l.categoryId, l]));
    const rows = expenseCategories.map((cat) => {
      const line = evalMap.get(cat.id);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        color: cat.color || line?.color,
        budgeted: line?.budgeted ?? 0,
        spent: line?.spent ?? 0,
        remaining: line ? line.remaining : 0,
        utilization: line?.utilization ?? 0,
        status: line?.status ?? "none",
      };
    });

    if (!search.trim()) return rows;
    const query = search.trim().toLowerCase();
    return rows.filter((r) => r.categoryName.toLowerCase().includes(query));
  }, [expenseCategories, evaluation, search]);

  const openOverallEditor = () => {
    setOverallLimitStr(monthlyBudget?.overallLimit ? String(monthlyBudget.overallLimit) : "");
    setSavingsTargetStr(monthlyBudget?.savingsTarget ? String(monthlyBudget.savingsTarget) : "");
    setEditOverallOpen(true);
  };

  const handleSaveOverall = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = overallLimitStr.trim() ? parseAmount(overallLimitStr) : null;
    const target = savingsTargetStr.trim() ? parseAmount(savingsTargetStr) : null;

    try {
      await budgetsRepo.upsert({
        id: `budget_${month}`,
        month,
        overallLimit: limit && limit > 0 ? limit : null,
        savingsTarget: target && target > 0 ? target : null,
        createdAt: monthlyBudget?.createdAt ?? nowISO(),
        updatedAt: nowISO(),
        schemaVersion: 1,
      });
      toast.success("Monthly budget targets updated");
      setEditOverallOpen(false);
    } catch (err) {
      toast.error("Failed to update monthly targets");
    }
  };

  const openCategoryEditor = (categoryId: string, name: string, current: number) => {
    setTargetCategory({ id: categoryId, name, current });
    setCategoryLimitStr(current > 0 ? String(current) : "");
    setCategoryModalOpen(true);
  };

  const handleSaveCategoryBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCategory) return;
    const amount = categoryLimitStr.trim() ? parseAmount(categoryLimitStr) : 0;
    try {
      await categoryBudgetsRepo.setAmount(month, targetCategory.id, amount);
      toast.success(`Budget for ${targetCategory.name} updated`);
      setCategoryModalOpen(false);
    } catch (err) {
      toast.error("Failed to update category budget");
    }
  };

  const handleCopyPreviousMonth = async () => {
    const prevMonth = addMonths(month, -1);
    try {
      await budgetsRepo.copyMonth(prevMonth, month);
      toast.success(`Copied budgets from ${monthLabel(prevMonth)}`);
    } catch (err) {
      toast.error("Failed to copy previous month budgets");
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "exceeded":
        return "destructive";
      case "critical":
      case "warning":
        return "warning";
      case "ok":
        return "success";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Budgets"
        description={`Set spending limits and savings goals for ${monthLabel(month)}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyPreviousMonth}>
              <Copy className="size-4" />
              Copy from previous month
            </Button>
            <Button size="sm" onClick={openOverallEditor}>
              <SlidersHorizontal className="size-4" />
              Monthly Targets
            </Button>
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Budgeted"
          value={fmt.money(evaluation.totalBudgeted)}
          subtitle={evaluation.budget?.overallLimit ? `Limit: ${fmt.money(evaluation.budget.overallLimit)}` : "Sum of category limits"}
          icon={Wallet}
        />
        <StatCard
          title="Total Spent"
          value={fmt.money(evaluation.totalSpent)}
          subtitle={`${fmt.percent(evaluation.overallUtilization ?? 0)} of monthly limit`}
          icon={TrendingUp}
        />
        <StatCard
          title="Remaining Budget"
          value={evaluation.overallRemaining !== null ? fmt.money(evaluation.overallRemaining) : "—"}
          subtitle={
            evaluation.overallRemaining !== null && evaluation.overallRemaining < 0
              ? "Over budget"
              : "Safe to spend"
          }
          tone={
            evaluation.overallRemaining !== null && evaluation.overallRemaining < 0
              ? "destructive"
              : "positive"
          }
        />
        <StatCard
          title="Monthly Savings Target"
          value={evaluation.savingsTarget !== null ? fmt.money(evaluation.savingsTarget) : "Not set"}
          subtitle={
            evaluation.savingsProgress !== null
              ? `${fmt.percent(evaluation.savingsProgress)} funded`
              : "Set a target in Monthly Targets"
          }
          tone="accent"
        />
      </div>

      {/* Category Budgets Table */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Category Limits</CardTitle>
            <CardDescription>Track and configure limits for each spending category.</CardDescription>
          </div>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {categoryRows.length === 0 ? (
            <EmptyState
              title="No categories found"
              description="Configure your expense categories in Settings to set budgets."
            />
          ) : (
            <div className="divide-y divide-border">
              {categoryRows.map((cat) => {
                const isOver = cat.status === "exceeded";
                const hasBudget = cat.budgeted > 0;
                return (
                  <div
                    key={cat.categoryId}
                    className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: cat.color || "var(--color-primary)" }}
                        />
                        <span className="font-medium text-foreground">{cat.categoryName}</span>
                        {hasBudget ? (
                          <Badge variant={statusBadgeVariant(cat.status)}>
                            {cat.status === "exceeded"
                              ? "Over Budget"
                              : cat.status === "warning" || cat.status === "critical"
                              ? "Near Limit"
                              : "On Track"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No Limit</Badge>
                        )}
                      </div>

                      {hasBudget ? (
                        <div className="space-y-1">
                          <Progress
                            value={Math.min(cat.utilization, 100)}
                            tone={isOver ? "destructive" : cat.status === "warning" || cat.status === "critical" ? "warning" : "default"}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{fmt.percent(cat.utilization)} spent</span>
                            <span>
                              {cat.remaining >= 0
                                ? `${fmt.money(cat.remaining)} left`
                                : `${fmt.money(Math.abs(cat.remaining))} over`}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Spent {fmt.money(cat.spent)} so far
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right">
                        <div className="text-sm font-semibold tabular-nums">
                          {fmt.money(cat.spent)}
                          <span className="text-xs font-normal text-muted-foreground">
                            {" "}
                            / {hasBudget ? fmt.money(cat.budgeted) : "—"}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCategoryEditor(cat.categoryId, cat.categoryName, cat.budgeted)}
                      >
                        <Edit3 className="size-3.5" />
                        {hasBudget ? "Edit" : "Set Limit"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Overall Dialog */}
      <Dialog open={editOverallOpen} onOpenChange={setEditOverallOpen}>
        <DialogContent>
          <form onSubmit={handleSaveOverall}>
            <DialogHeader>
              <DialogTitle>Monthly Targets ({monthLabel(month)})</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="overallLimit">Overall Monthly Spending Limit</Label>
                <Input
                  id="overallLimit"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 50000 (optional)"
                  value={overallLimitStr}
                  onChange={(e) => setOverallLimitStr(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to auto-calculate from category limits.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="savingsTarget">Monthly Savings Target</Label>
                <Input
                  id="savingsTarget"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 15000 (optional)"
                  value={savingsTargetStr}
                  onChange={(e) => setSavingsTargetStr(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Target amount to put into savings or investments this month.
                </p>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOverallOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Targets</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Limit Dialog */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent>
          <form onSubmit={handleSaveCategoryBudget}>
            <DialogHeader>
              <DialogTitle>Set Budget for {targetCategory?.name}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="categoryLimit">Budget Amount for {monthLabel(month)}</Label>
                <Input
                  id="categoryLimit"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 8000 (0 to remove)"
                  value={categoryLimitStr}
                  onChange={(e) => setCategoryLimitStr(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter 0 or leave empty to remove the budget for this category.
                </p>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Limit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
