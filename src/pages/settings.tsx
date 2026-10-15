import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Archive,
  CreditCard,
  LayoutDashboard,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
  Settings2,
  Tags,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_TYPE_LABELS, CURRENCIES, TRANSACTION_TYPE_META } from "@/domain/constants";
import { CATEGORY_TYPES, THEMES, type Category, type CategoryType, type PaymentMethod, type RecurringRule, type Theme } from "@/domain/types";
import { defaultDashboardLayout } from "@/data/defaults";
import { categoriesRepo, paymentMethodsRepo, recurringRepo, settingsRepo } from "@/data/repositories";
import { useCategories, usePaymentMethods, useRecurring, useSettings } from "@/state/hooks";
import { useFormat } from "@/state/format";
import { formatDate } from "@/lib/date";
import { parseAmount } from "@/lib/money";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Small presentational helpers                                               */
/* -------------------------------------------------------------------------- */

function SettingRow({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="shrink-0 sm:w-64">{children}</div>
    </div>
  );
}

function NumberField({
  id,
  value,
  onCommit,
  placeholder,
  min = 0,
}: {
  id: string;
  value: number | null;
  onCommit: (value: number | null) => void;
  placeholder?: string;
  min?: number;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onCommit(null);
      return;
    }
    const parsed = parseAmount(trimmed);
    if (!Number.isFinite(parsed) || parsed < min) {
      toast.error("Please enter a valid number.");
      setDraft(value === null ? "" : String(value));
      return;
    }
    onCommit(parsed);
  };

  return (
    <Input
      id={id}
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export function SettingsPage() {
  const fmt = useFormat();
  const settings = useSettings();
  const categories = useCategories(true);
  const paymentMethods = usePaymentMethods();
  const recurring = useRecurring();

  const [showArchived, setShowArchived] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<CategoryType>("expense");
  const [categoryColor, setCategoryColor] = useState("#0ea5e9");

  const [pendingCategoryAction, setPendingCategoryAction] = useState<Category | null>(null);
  const [pendingMethodAction, setPendingMethodAction] = useState<PaymentMethod | null>(null);
  const [pendingRuleDelete, setPendingRuleDelete] = useState<RecurringRule | null>(null);

  const [newMethodName, setNewMethodName] = useState("");
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [methodName, setMethodName] = useState("");

  const [resetDashboardOpen, setResetDashboardOpen] = useState(false);

  const visibleCategories = useMemo(
    () => (showArchived ? categories : categories.filter((c) => !c.archivedAt)),
    [categories, showArchived],
  );

  const patch = async (values: Parameters<typeof settingsRepo.patch>[0], message: string) => {
    try {
      await settingsRepo.patch(values);
      toast.success(message);
    } catch (error) {
      console.error(error);
      toast.error("Could not save that setting.");
    }
  };

  /* ----------------------------- Categories ------------------------------ */

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryType("expense");
    setCategoryColor("#0ea5e9");
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryType(category.type);
    setCategoryColor(category.color ?? "#0ea5e9");
    setCategoryDialogOpen(true);
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) {
      toast.error("Please enter a category name.");
      return;
    }
    try {
      if (editingCategory) {
        await categoriesRepo.update(editingCategory.id, { name, color: categoryColor, type: categoryType });
        toast.success("Category updated");
      } else {
        await categoriesRepo.create({ name, type: categoryType, color: categoryColor });
        toast.success("Category added");
      }
      setCategoryDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Could not save the category.");
    }
  };

  const confirmCategoryRemoval = async () => {
    if (!pendingCategoryAction) return;
    try {
      const result = await categoriesRepo.removeOrArchive(pendingCategoryAction.id);
      toast.success(
        result === "archived"
          ? "Category archived — existing transactions keep their label."
          : "Category deleted",
      );
    } catch (error) {
      console.error(error);
      toast.error("Could not remove the category.");
    }
  };

  /* --------------------------- Payment methods --------------------------- */

  const addMethod = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newMethodName.trim();
    if (!name) return;
    try {
      await paymentMethodsRepo.create({ name });
      setNewMethodName("");
      toast.success("Payment method added");
    } catch (error) {
      console.error(error);
      toast.error("Could not add the payment method.");
    }
  };

  const renameMethod = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingMethod) return;
    const name = methodName.trim();
    if (!name) return;
    try {
      await paymentMethodsRepo.update(editingMethod.id, { name });
      setEditingMethod(null);
      toast.success("Payment method renamed");
    } catch (error) {
      console.error(error);
      toast.error("Could not rename the payment method.");
    }
  };

  const confirmMethodRemoval = async () => {
    if (!pendingMethodAction) return;
    try {
      const result = await paymentMethodsRepo.removeOrArchive(pendingMethodAction.id);
      toast.success(result === "archived" ? "Payment method archived" : "Payment method deleted");
    } catch (error) {
      console.error(error);
      toast.error("Could not remove the payment method.");
    }
  };

  /* ------------------------------ Recurring ------------------------------ */

  const toggleRule = async (rule: RecurringRule, active: boolean) => {
    try {
      await recurringRepo.update(rule.id, { active });
      toast.success(active ? "Recurring rule resumed" : "Recurring rule paused");
    } catch (error) {
      console.error(error);
      toast.error("Could not update the recurring rule.");
    }
  };

  const confirmRuleDelete = async () => {
    if (!pendingRuleDelete) return;
    try {
      await recurringRepo.remove(pendingRuleDelete.id);
      toast.success("Recurring rule deleted");
    } catch (error) {
      console.error(error);
      toast.error("Could not delete the recurring rule.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Currency, categories, payment methods and preferences — all stored on this device."
      />

      <Tabs defaultValue="general">
        <TabsList className="sm:w-auto">
          <TabsTrigger value="general">
            <Settings2 className="size-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tags className="size-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="size-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="recurring">
            <Repeat className="size-4" />
            Recurring
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="size-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------- General ------------------------------ */}
        <TabsContent value="general" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Money &amp; region</CardTitle>
              <CardDescription>How amounts are displayed across the app.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <SettingRow title="Currency" description="Indian Rupee (₹) is the default.">
                <Select
                  value={settings.currency}
                  onValueChange={(code) => {
                    const meta = CURRENCIES.find((c) => c.code === code);
                    void patch({ currency: code, locale: meta?.locale ?? settings.locale }, `Currency set to ${code}`);
                  }}
                >
                  <SelectTrigger aria-label="Currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.code} — {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow title="Locale" description="Controls number and date grouping.">
                <Select
                  value={settings.locale}
                  onValueChange={(locale) => void patch({ locale }, "Locale updated")}
                >
                  <SelectTrigger aria-label="Locale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(CURRENCIES.map((c) => c.locale))).map((locale) => (
                      <SelectItem key={locale} value={locale}>
                        {locale}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow title="Theme" description="Light, dark, or follow your system.">
                <Select value={settings.theme} onValueChange={(theme) => void patch({ theme: theme as Theme }, "Theme updated")}>
                  <SelectTrigger aria-label="Theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map((theme) => (
                      <SelectItem key={theme} value={theme}>
                        {theme[0].toUpperCase() + theme.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow title="Week starts on" description="Affects weekly summaries and calendars.">
                <Select
                  value={String(settings.weekStartsOn)}
                  onValueChange={(value) => void patch({ weekStartsOn: Number(value) }, "Week start updated")}
                >
                  <SelectTrigger aria-label="Week starts on">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="0">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget &amp; saving rules</CardTitle>
              <CardDescription>Control how spending and contributions are measured.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <SettingRow
                title="Count savings &amp; investments as expenses"
                description="Off by default — contributions stay separate from consumption spending."
              >
                <div className="flex sm:justify-end">
                  <Switch
                    checked={settings.countContributionsAsExpenses}
                    onCheckedChange={(checked) =>
                      void patch({ countContributionsAsExpenses: checked }, "Preference saved")
                    }
                    aria-label="Count contributions as expenses"
                  />
                </div>
              </SettingRow>

              <SettingRow title="Hide transfers from reports" description="Transfers move money between your own accounts.">
                <div className="flex sm:justify-end">
                  <Switch
                    checked={settings.hideTransfersFromReports}
                    onCheckedChange={(checked) => void patch({ hideTransfersFromReports: checked }, "Preference saved")}
                    aria-label="Hide transfers from reports"
                  />
                </div>
              </SettingRow>

              <SettingRow
                title="Approximate monthly income"
                description="Used for guidance only. Leave blank if you would rather not say."
              >
                <NumberField
                  id="approximate-income"
                  value={settings.approximateMonthlyIncome}
                  placeholder="e.g. 100000"
                  onCommit={(value) => void patch({ approximateMonthlyIncome: value }, "Income guidance saved")}
                />
              </SettingRow>

              <div className="py-3.5">
                <p className="text-sm font-medium">Budget alert thresholds</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Percentages of a category limit that trigger a warning, then a critical alert.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(["Warning at", "Critical at", "Over budget at"] as const).map((label, index) => (
                    <div key={label} className="space-y-1.5">
                      <Label htmlFor={`threshold-${index}`}>{label}</Label>
                      <NumberField
                        id={`threshold-${index}`}
                        value={settings.budgetThresholds[index] ?? null}
                        placeholder={String([75, 90, 100][index])}
                        onCommit={(value) => {
                          if (value === null) return;
                          const next = [...settings.budgetThresholds];
                          next[index] = value;
                          void patch({ budgetThresholds: next }, "Thresholds updated");
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>First-run setup</CardTitle>
              <CardDescription>Replay the welcome wizard without losing any data.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void patch({ onboardingCompleted: false }, "Setup wizard reopened")}>
                <RotateCcw />
                Run setup again
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/data">Data &amp; storage</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ Categories ---------------------------- */}
        <TabsContent value="categories" className="space-y-5">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Categories with history are archived rather than deleted, so old transactions keep their label.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showArchived ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowArchived((value) => !value)}
                  aria-pressed={showArchived}
                >
                  {showArchived ? "Showing archived" : "Hide archived"}
                </Button>
                <Button size="sm" onClick={openCreateCategory}>
                  <Plus />
                  Add category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {visibleCategories.length === 0 ? (
                <EmptyState title="No categories" description="Add a category to start organising your money." />
              ) : (
                <ul className="divide-y divide-border">
                  {visibleCategories.map((category) => (
                    <li key={category.id} className={cn("flex items-center gap-3 py-2.5", category.archivedAt && "opacity-60")}>
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color ?? "var(--color-muted-foreground)" }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{category.name}</span>
                          <Badge variant="outline">{CATEGORY_TYPE_LABELS[category.type]}</Badge>
                          {category.isSystem ? <Badge variant="secondary">Built-in</Badge> : null}
                          {category.archivedAt ? <Badge variant="warning">Archived</Badge> : null}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${category.name}`} onClick={() => openEditCategory(category)}>
                        <Pencil />
                      </Button>
                      {!category.archivedAt ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Archive or delete ${category.name}`}
                          onClick={() => setPendingCategoryAction(category)}
                        >
                          <Archive />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------- Payment methods -------------------------- */}
        <TabsContent value="payments" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Payment methods</CardTitle>
              <CardDescription>Cash, cards, UPI and wallets you spend from.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={addMethod} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newMethodName}
                  onChange={(e) => setNewMethodName(e.target.value)}
                  placeholder="Add a payment method, e.g. Wallet"
                  aria-label="New payment method name"
                />
                <Button type="submit" className="sm:w-32">
                  <Plus />
                  Add
                </Button>
              </form>

              {paymentMethods.length === 0 ? (
                <EmptyState title="No payment methods" description="Add one above to start recording transactions." />
              ) : (
                <ul className="divide-y divide-border">
                  {paymentMethods.map((method) => (
                    <li key={method.id} className={cn("flex items-center gap-3 py-2.5", method.archivedAt && "opacity-60")}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{method.name}</span>
                          {method.isSystem ? <Badge variant="secondary">Built-in</Badge> : null}
                          {method.archivedAt ? <Badge variant="warning">Archived</Badge> : null}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Rename ${method.name}`}
                        onClick={() => {
                          setEditingMethod(method);
                          setMethodName(method.name);
                        }}
                      >
                        <Pencil />
                      </Button>
                      {!method.archivedAt ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Archive or delete ${method.name}`}
                          onClick={() => setPendingMethodAction(method)}
                        >
                          <Archive />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ Recurring ----------------------------- */}
        <TabsContent value="recurring" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Recurring rules</CardTitle>
              <CardDescription>
                Generated automatically each month. Pause a rule to stop new entries without losing its history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recurring.length === 0 ? (
                <EmptyState
                  title="No recurring rules"
                  description="Turn on “Repeat monthly” when adding a transaction to create one."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {recurring.map((rule) => (
                    <li key={rule.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{rule.description}</span>
                          <Badge variant="outline">{TRANSACTION_TYPE_META[rule.type].shortLabel}</Badge>
                          {!rule.active ? <Badge variant="warning">Paused</Badge> : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {fmt.money(rule.amount)} · {rule.frequency} on day {rule.anchor} · from {formatDate(rule.startDate)}
                        </p>
                      </div>
                      <Switch
                        checked={rule.active}
                        onCheckedChange={(checked) => void toggleRule(rule, checked)}
                        aria-label={`${rule.active ? "Pause" : "Resume"} ${rule.description}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${rule.description}`}
                        onClick={() => setPendingRuleDelete(rule)}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ Dashboard ----------------------------- */}
        <TabsContent value="dashboard" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard layout</CardTitle>
              <CardDescription>
                Widgets are shown, hidden and reordered from the Customise button on the dashboard itself.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {settings.dashboard.filter((widget) => widget.visible).length} of {settings.dashboard.length} widgets are visible.
              </p>
              <Button variant="outline" size="sm" onClick={() => setResetDashboardOpen(true)}>
                <RotateCcw />
                Reset to default layout
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ----------------------- Category create / edit ----------------------- */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={saveCategory}>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit category" : "Add category"}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="category-name">Name</Label>
                <Input
                  id="category-name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Pet care"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category-type">Type</Label>
                <Select value={categoryType} onValueChange={(value) => setCategoryType(value as CategoryType)}>
                  <SelectTrigger id="category-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {CATEGORY_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category-color">Colour</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="category-color"
                    type="color"
                    value={categoryColor}
                    onChange={(e) => setCategoryColor(e.target.value)}
                    className="size-9 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <span className="text-xs uppercase text-muted-foreground">{categoryColor}</span>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingCategory ? "Save changes" : "Add category"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------------------- Rename method --------------------------- */}
      <Dialog open={Boolean(editingMethod)} onOpenChange={(open) => !open && setEditingMethod(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={renameMethod}>
            <DialogHeader>
              <DialogTitle>Rename payment method</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-1.5">
              <Label htmlFor="method-name">Name</Label>
              <Input id="method-name" value={methodName} onChange={(e) => setMethodName(e.target.value)} autoFocus />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingMethod(null)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingCategoryAction)}
        onOpenChange={(open) => !open && setPendingCategoryAction(null)}
        title={`Remove “${pendingCategoryAction?.name ?? ""}”?`}
        description="If any transactions use this category it will be archived so their history stays intact; otherwise it is deleted."
        confirmLabel="Remove"
        onConfirm={confirmCategoryRemoval}
      />

      <ConfirmDialog
        open={Boolean(pendingMethodAction)}
        onOpenChange={(open) => !open && setPendingMethodAction(null)}
        title={`Remove “${pendingMethodAction?.name ?? ""}”?`}
        description="If any transactions use this method it will be archived so their history stays intact; otherwise it is deleted."
        confirmLabel="Remove"
        onConfirm={confirmMethodRemoval}
      />

      <ConfirmDialog
        open={Boolean(pendingRuleDelete)}
        onOpenChange={(open) => !open && setPendingRuleDelete(null)}
        title={`Delete the “${pendingRuleDelete?.description ?? ""}” rule?`}
        description="Existing transactions it generated are kept. No further entries will be created."
        confirmLabel="Delete rule"
        onConfirm={confirmRuleDelete}
      />

      <ConfirmDialog
        open={resetDashboardOpen}
        onOpenChange={setResetDashboardOpen}
        title="Reset the dashboard layout?"
        description="Every widget returns to its default visibility, size and order."
        confirmLabel="Reset layout"
        onConfirm={() => patch({ dashboard: defaultDashboardLayout() }, "Dashboard layout reset")}
      />
    </div>
  );
}
