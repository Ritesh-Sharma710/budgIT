import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CloudOff,
  Database,
  FileSpreadsheet,
  HardDrive,
  Sparkles,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { db, TABLES } from "@/data/db";
import { collectAll, importAll, validateBackup, type ImportStrategy } from "@/data/backup";
import { parseTransactionsCsv, transactionsToCsv } from "@/data/csv";
import { hasDemoData, installDemoData, removeDemoData } from "@/data/demo";
import { defaultSettings, seedCategories, seedPaymentMethods } from "@/data/defaults";
import { categoriesRepo, transactionsRepo } from "@/data/repositories";
import { useCategories, usePaymentMethods, useTransactions } from "@/state/hooks";
import { todayISO } from "@/lib/date";

export function DataPage() {
  const transactions = useTransactions();
  const categories = useCategories();
  const paymentMethods = usePaymentMethods();

  const [hasDemo, setHasDemo] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);
  // Merge keeps existing records; "replace" wipes first. Exposed to the UI later.
  const [importStrategy] = useState<ImportStrategy>("merge");

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const checkDemoStatus = async () => {
    try {
      const active = await hasDemoData();
      setHasDemo(active);
    } catch {
      setHasDemo(false);
    }
  };

  useEffect(() => {
    checkDemoStatus();
  }, [transactions]);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Export JSON
  const handleExportJson = async () => {
    try {
      const data = await collectAll();
      const payload = {
        app: "budgIT",
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        counts: Object.fromEntries(TABLES.map((t) => [t, (data as any)[t]?.length ?? 0])),
        data,
      };
      downloadFile(
        JSON.stringify(payload, null, 2),
        `budgit-backup-${todayISO()}.json`,
        "application/json",
      );
      toast.success("Complete JSON backup downloaded successfully");
    } catch (err) {
      toast.error("Failed to export JSON backup");
    }
  };

  // 2. Restore JSON
  const handleJsonFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validation = validateBackup(parsed);

      if (!validation.ok) {
        toast.error(`Invalid backup file: ${validation.errors.join(", ")}`);
        return;
      }

      await importAll(validation.payload!, importStrategy);
      toast.success("Backup restored successfully!");
    } catch (err) {
      toast.error("Failed to parse and restore JSON backup");
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = "";
    }
  };

  // 3. Export CSV
  const handleExportCsv = () => {
    try {
      const csv = transactionsToCsv(transactions, categories, paymentMethods);
      downloadFile(csv, `budgit-transactions-${todayISO()}.csv`, "text/csv;charset=utf-8;");
      toast.success("Transactions exported as CSV");
    } catch (err) {
      toast.error("Failed to export transactions CSV");
    }
  };

  // 4. Import CSV
  const handleCsvFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseTransactionsCsv(text, {
        categories,
        paymentMethods,
        createMissingCategories: true,
      });

      if (result.errors.length > 0 && result.transactions.length === 0) {
        toast.error(`CSV parsing failed: ${result.errors[0].errors.join(", ")}`);
        return;
      }

      // Add new categories if any
      for (const cat of result.newCategories) {
        await categoriesRepo.create({ name: cat.name, type: cat.type });
      }

      // Add transactions
      for (const tx of result.transactions) {
        await transactionsRepo.create(tx as any);
      }

      toast.success(`Imported ${result.transactions.length} transaction(s) successfully!`);
    } catch (err) {
      toast.error("Failed to parse and import CSV file");
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  // 5. Demo Data actions
  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      await installDemoData();
      await checkDemoStatus();
      toast.success("Sample demo transactions and budgets loaded!");
    } catch (err) {
      toast.error("Failed to load demo data");
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleRemoveDemo = async () => {
    setLoadingDemo(true);
    try {
      await removeDemoData();
      await checkDemoStatus();
      toast.success("Demo records removed cleanly.");
    } catch (err) {
      toast.error("Failed to remove demo data");
    } finally {
      setLoadingDemo(false);
    }
  };

  // 6. Reset / Wipe Database
  const handleWipeAll = async () => {
    try {
      await Promise.all(TABLES.map((t) => db.table(t).clear()));
      await db.settings.put(defaultSettings());
      await db.categories.bulkPut(seedCategories());
      await db.paymentMethods.bulkPut(seedPaymentMethods());
      setWipeConfirmOpen(false);
      await checkDemoStatus();
      toast.success("All data erased and initial defaults restored.");
    } catch (err) {
      toast.error("Failed to erase local data");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Google Sheets & Data Management"
        description="Your financial data is stored locally in your browser (IndexedDB). No analytics, no account, no tracking."
      />

      {/* Storage Mode Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="size-5 text-primary" />
              <CardTitle>Storage Mode: Local-First (IndexedDB)</CardTitle>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <CardDescription>
            All income, expenses, budgets and savings goals are stored directly in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <CloudOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">Google Sheets Cloud Sync (Phase 6)</p>
                <p className="text-muted-foreground">
                  Per the project roadmap, cloud synchronization via Google Sheets will be introduced in Phase 6. In the meantime, your records are completely private to this device. You can download and restore full backups at any time below.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Data Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <CardTitle>Sample Demo Data</CardTitle>
            </div>
            {hasDemo ? <Badge variant="info">Demo Data Active</Badge> : <Badge variant="outline">Clean</Badge>}
          </div>
          <CardDescription>
            Populate realistic transactions, category limits, and savings goals to explore the dashboards and reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant={hasDemo ? "outline" : "default"}
            size="sm"
            disabled={loadingDemo}
            onClick={handleLoadDemo}
          >
            <Sparkles className="size-4" />
            {hasDemo ? "Re-seed Demo Data" : "Load Sample Demo Data"}
          </Button>

          {hasDemo ? (
            <Button
              variant="outline"
              size="sm"
              disabled={loadingDemo}
              className="text-destructive hover:text-destructive"
              onClick={handleRemoveDemo}
            >
              <Trash2 className="size-4" />
              Remove Demo Records
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Backup and Restore (JSON) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="size-5 text-primary" />
              <CardTitle>JSON Backup & Restore</CardTitle>
            </div>
            <CardDescription>
              A single portable file containing all your settings, transactions, categories, budgets, and goals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={handleExportJson}>
                <ArrowDownToLine className="size-4" />
                Download JSON Backup
              </Button>

              <div className="pt-2">
                <input
                  type="file"
                  ref={jsonInputRef}
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleJsonFileSelected}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => jsonInputRef.current?.click()}
                >
                  <ArrowUpFromLine className="size-4" />
                  Restore from JSON File
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CSV Import & Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              <CardTitle>CSV Spreadsheet Import / Export</CardTitle>
            </div>
            <CardDescription>
              Export transactions to Excel or Google Sheets, or import statements from your bank.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={handleExportCsv}>
                <ArrowDownToLine className="size-4" />
                Export Transactions as CSV
              </Button>

              <div className="pt-2">
                <input
                  type="file"
                  ref={csvInputRef}
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleCsvFileSelected}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <ArrowUpFromLine className="size-4" />
                  Import Transactions from CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <CardTitle>Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Permanently clear all local financial records and reset the database to factory initial state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setWipeConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
            Erase All Local Data
          </Button>
        </CardContent>
      </Card>

      {/* Erase Confirmation Modal */}
      <ConfirmDialog
        open={wipeConfirmOpen}
        onOpenChange={setWipeConfirmOpen}
        title="Erase all data and reset?"
        description="This will permanently delete all transactions, budgets, savings goals, and custom categories from your browser. Be sure to export a JSON backup first if you wish to retain a copy."
        confirmLabel="Erase Everything"
        destructive
        onConfirm={handleWipeAll}
      />
    </div>
  );
}
