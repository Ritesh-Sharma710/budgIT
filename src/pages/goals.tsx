import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  CheckCircle2,
  Coins,
  Edit3,
  Minus,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog, Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatCard } from "@/components/dashboard/stat-card";
import { goalProgress, goalSaved } from "@/domain/calculations";
import type { GoalStatus, SavingsGoal } from "@/domain/types";
import { goalContributionsRepo, goalsRepo } from "@/data/repositories";
import { useGoalContributions, useGoals } from "@/state/hooks";
import { useFormat } from "@/state/format";
import { formatDate, todayISO } from "@/lib/date";
import { parseAmount } from "@/lib/money";

export function GoalsPage() {
  const fmt = useFormat();
  const goals = useGoals();
  const contributions = useGoalContributions();

  const [activeTab, setActiveTab] = useState<"active" | "completed" | "archived" | "all">("active");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const [contributeDialogOpen, setContributeDialogOpen] = useState(false);
  const [targetGoalForContribution, setTargetGoalForContribution] = useState<SavingsGoal | null>(null);
  const [contributionType, setContributionType] = useState<"add" | "withdraw">("add");
  const [contribAmountStr, setContribAmountStr] = useState("");
  const [contribNotes, setContribNotes] = useState("");
  const [contribDate, setContribDate] = useState(todayISO());

  const [deleteGoalConfirm, setDeleteGoalConfirm] = useState<SavingsGoal | null>(null);

  // Form states for Create/Edit Goal
  const [goalName, setGoalName] = useState("");
  const [goalTargetStr, setGoalTargetStr] = useState("");
  const [goalInitialStr, setGoalInitialStr] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalColor, setGoalColor] = useState("#3b82f6");
  const [goalNotes, setGoalNotes] = useState("");

  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);

  const summary = useMemo(() => {
    let totalTarget = 0;
    let totalSaved = 0;
    let onTrackCount = 0;
    let completedCount = 0;

    for (const g of activeGoals) {
      const saved = goalSaved(g, contributions);
      const prog = goalProgress(g, contributions);
      totalTarget += g.targetAmount;
      totalSaved += saved;
      if (prog.status === "on-track") onTrackCount += 1;
      if (prog.status === "completed") completedCount += 1;
    }

    const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    return { totalTarget, totalSaved, overallPct, onTrackCount, completedCount };
  }, [activeGoals, contributions]);

  const filteredGoals = useMemo(() => {
    if (activeTab === "all") return goals;
    return goals.filter((g) => g.status === activeTab);
  }, [goals, activeTab]);

  const openCreateDialog = () => {
    setEditingGoal(null);
    setGoalName("");
    setGoalTargetStr("");
    setGoalInitialStr("0");
    setGoalTargetDate("");
    setGoalColor("#3b82f6");
    setGoalNotes("");
    setCreateDialogOpen(true);
  };

  const openEditDialog = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setGoalTargetStr(String(goal.targetAmount));
    setGoalInitialStr(String(goal.initialAmount));
    setGoalTargetDate(goal.targetDate ?? "");
    setGoalColor(goal.color ?? "#3b82f6");
    setGoalNotes(goal.notes ?? "");
    setCreateDialogOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = goalName.trim();
    if (!name) {
      toast.error("Please enter a goal name");
      return;
    }
    const targetAmount = parseAmount(goalTargetStr);
    if (targetAmount <= 0) {
      toast.error("Please enter a valid target amount");
      return;
    }
    const initialAmount = parseAmount(goalInitialStr) || 0;

    try {
      if (editingGoal) {
        await goalsRepo.update(editingGoal.id, {
          name,
          targetAmount,
          initialAmount,
          targetDate: goalTargetDate ? goalTargetDate : null,
          color: goalColor,
          notes: goalNotes.trim() ? goalNotes.trim() : null,
        });
        toast.success("Goal updated");
      } else {
        await goalsRepo.create({
          name,
          targetAmount,
          initialAmount,
          targetDate: goalTargetDate ? goalTargetDate : null,
          color: goalColor,
          notes: goalNotes.trim() ? goalNotes.trim() : null,
          status: "active",
        });
        toast.success("Goal created");
      }
      setCreateDialogOpen(false);
    } catch (err) {
      toast.error("Failed to save goal");
    }
  };

  const openContributeDialog = (goal: SavingsGoal, type: "add" | "withdraw") => {
    setTargetGoalForContribution(goal);
    setContributionType(type);
    setContribAmountStr("");
    setContribNotes("");
    setContribDate(todayISO());
    setContributeDialogOpen(true);
  };

  const handleSaveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGoalForContribution) return;
    const amountVal = parseAmount(contribAmountStr);
    if (amountVal <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const signedAmount = contributionType === "withdraw" ? -amountVal : amountVal;

    try {
      await goalContributionsRepo.create({
        goalId: targetGoalForContribution.id,
        amount: signedAmount,
        date: contribDate,
        notes: contribNotes.trim() ? contribNotes.trim() : null,
      });

      // If progress reached 100%, check if we should auto-mark active or completed
      const updatedSaved = goalSaved(targetGoalForContribution, contributions) + signedAmount;
      if (updatedSaved >= targetGoalForContribution.targetAmount && targetGoalForContribution.status === "active") {
        await goalsRepo.update(targetGoalForContribution.id, { status: "completed" });
        toast.success(`🎉 Congratulations! You reached your goal for "${targetGoalForContribution.name}"!`);
      } else {
        toast.success(contributionType === "withdraw" ? "Withdrawal recorded" : "Contribution recorded");
      }

      setContributeDialogOpen(false);
    } catch (err) {
      toast.error("Failed to record contribution");
    }
  };

  const handleToggleStatus = async (goal: SavingsGoal, nextStatus: GoalStatus) => {
    try {
      await goalsRepo.update(goal.id, { status: nextStatus });
      toast.success(`Goal marked as ${nextStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteGoal = async () => {
    if (!deleteGoalConfirm) return;
    try {
      await goalsRepo.remove(deleteGoalConfirm.id);
      toast.success("Goal deleted");
      setDeleteGoalConfirm(null);
    } catch {
      toast.error("Failed to delete goal");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "on-track":
        return <Badge variant="default">On Track</Badge>;
      case "behind":
        return <Badge variant="warning">Behind Pace</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">In Progress</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings Goals"
        description="Fund the milestones that matter: emergency funds, travel, gadgets, and dreams."
        actions={
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="size-4" />
            New Goal
          </Button>
        }
      />

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Target"
          value={fmt.money(summary.totalTarget)}
          subtitle={`${activeGoals.length} active goals`}
          icon={Target}
        />
        <StatCard
          title="Total Saved"
          value={fmt.money(summary.totalSaved)}
          subtitle={`${fmt.percent(summary.overallPct)} overall funded`}
          icon={Coins}
        />
        <StatCard
          title="Overall Progress"
          value={fmt.percent(summary.overallPct)}
          subtitle={`${fmt.money(Math.max(summary.totalTarget - summary.totalSaved, 0))} remaining`}
          tone="positive"
        />
        <StatCard
          title="On-Track Goals"
          value={`${summary.onTrackCount} / ${activeGoals.length}`}
          subtitle="Pacing on schedule"
          tone="accent"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="active">Active ({goals.filter((g) => g.status === "active").length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({goals.filter((g) => g.status === "completed").length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({goals.filter((g) => g.status === "archived").length})</TabsTrigger>
            <TabsTrigger value="all">All ({goals.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          title="No goals found"
          description={
            activeTab === "active"
              ? "You haven't set any active savings goals yet. Create one to begin tracking."
              : "No goals match the current tab filter."
          }
          action={
            activeTab === "active" ? (
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="size-4" /> Create your first goal
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => {
            const saved = goalSaved(goal, contributions);
            const progress = goalProgress(goal, contributions);
            const remaining = Math.max(goal.targetAmount - saved, 0);

            return (
              <Card key={goal.id} className="flex flex-col justify-between overflow-hidden transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3.5 shrink-0 rounded-full"
                        style={{ backgroundColor: goal.color || "var(--color-primary)" }}
                      />
                      <CardTitle className="text-base">{goal.name}</CardTitle>
                    </div>
                    {getStatusBadge(progress.status)}
                  </div>
                  {goal.notes ? (
                    <CardDescription className="line-clamp-2">{goal.notes}</CardDescription>
                  ) : null}
                </CardHeader>

                <CardContent className="space-y-4 pb-4">
                  <div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-semibold tabular-nums text-foreground">
                        {fmt.money(saved)}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        of {fmt.money(goal.targetAmount)} ({fmt.percent(progress.progress)})
                      </span>
                    </div>
                    <Progress
                      value={progress.progress}
                      className="mt-2"
                      tone={
                        progress.status === "completed"
                          ? "default"
                          : progress.status === "behind" || progress.status === "overdue"
                          ? "warning"
                          : "default"
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-2.5 text-xs">
                    <div>
                      <span className="text-muted-foreground">Remaining</span>
                      <p className="font-medium tabular-nums text-foreground">{fmt.money(remaining)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target Date</span>
                      <p className="font-medium text-foreground">
                        {goal.targetDate ? formatDate(goal.targetDate) : "Open-ended"}
                      </p>
                    </div>
                    {progress.requiredMonthly !== null && progress.status !== "completed" ? (
                      <div className="col-span-2 border-t border-border/50 pt-1.5 text-muted-foreground">
                        Need <strong className="text-foreground">{fmt.money(progress.requiredMonthly)}/mo</strong> to finish on time.
                      </div>
                    ) : null}
                  </div>
                </CardContent>

                <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => openContributeDialog(goal, "add")}
                    >
                      <Plus className="size-3.5" />
                      Add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-muted-foreground"
                      onClick={() => openContributeDialog(goal, "withdraw")}
                    >
                      <Minus className="size-3.5" />
                      Withdraw
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEditDialog(goal)}
                    >
                      <Edit3 className="size-3.5" />
                    </Button>
                    {goal.status === "active" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Archive"
                        onClick={() => handleToggleStatus(goal, "archived")}
                      >
                        <Archive className="size-3.5" />
                      </Button>
                    ) : goal.status === "archived" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Reactivate"
                        onClick={() => handleToggleStatus(goal, "active")}
                      >
                        <CheckCircle2 className="size-3.5" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteGoalConfirm(goal)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSaveGoal}>
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Edit Savings Goal" : "New Savings Goal"}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="goalName">Goal Name</Label>
                <Input
                  id="goalName"
                  placeholder="e.g. Emergency Fund, New Laptop, Holiday"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="goalTarget">Target Amount</Label>
                  <Input
                    id="goalTarget"
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 50000"
                    value={goalTargetStr}
                    onChange={(e) => setGoalTargetStr(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goalInitial">Initial Amount Saved</Label>
                  <Input
                    id="goalInitial"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 5000"
                    value={goalInitialStr}
                    onChange={(e) => setGoalInitialStr(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="goalDate">Target Date (optional)</Label>
                  <Input
                    id="goalDate"
                    type="date"
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goalColor">Color Tag</Label>
                  <div className="flex h-10 items-center gap-2">
                    <input
                      type="color"
                      id="goalColor"
                      value={goalColor}
                      onChange={(e) => setGoalColor(e.target.value)}
                      className="size-9 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    />
                    <span className="text-xs uppercase text-muted-foreground">{goalColor}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="goalNotes">Notes (optional)</Label>
                <Input
                  id="goalNotes"
                  placeholder="Motivation or notes about this goal"
                  value={goalNotes}
                  onChange={(e) => setGoalNotes(e.target.value)}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingGoal ? "Save Changes" : "Create Goal"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribution Dialog */}
      <Dialog open={contributeDialogOpen} onOpenChange={setContributeDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSaveContribution}>
            <DialogHeader>
              <DialogTitle>
                {contributionType === "withdraw" ? "Withdraw from" : "Add to"}{" "}
                {targetGoalForContribution?.name}
              </DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="contribAmount">Amount</Label>
                <Input
                  id="contribAmount"
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="e.g. 2000"
                  value={contribAmountStr}
                  onChange={(e) => setContribAmountStr(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contribDate">Date</Label>
                <Input
                  id="contribDate"
                  type="date"
                  value={contribDate}
                  onChange={(e) => setContribDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contribNotes">Notes (optional)</Label>
                <Input
                  id="contribNotes"
                  placeholder="e.g. Monthly transfer, bonus"
                  value={contribNotes}
                  onChange={(e) => setContribNotes(e.target.value)}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setContributeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {contributionType === "withdraw" ? "Record Withdrawal" : "Record Contribution"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteGoalConfirm)}
        onOpenChange={(open) => !open && setDeleteGoalConfirm(null)}
        title={`Delete "${deleteGoalConfirm?.name}"?`}
        description="This will permanently delete this savings goal and all of its recorded contributions. This action cannot be undone."
        confirmLabel="Delete Goal"
        destructive
        onConfirm={handleDeleteGoal}
      />
    </div>
  );
}
