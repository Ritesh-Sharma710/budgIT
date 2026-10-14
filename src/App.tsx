import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardPage } from "@/pages/dashboard";
import { TransactionsPage } from "@/pages/transactions";
import { BudgetsPage } from "@/pages/budgets";
import { GoalsPage } from "@/pages/goals";
import { MonthlyReportPage } from "@/pages/reports-monthly";
import { AnnualReportPage } from "@/pages/reports-annual";
import { DataPage } from "@/pages/data";
import { SettingsPage } from "@/pages/settings";
import { NotFoundPage } from "@/pages/not-found";
import { useBootstrap } from "@/state/bootstrap";
import { useThemeEffect } from "@/hooks/use-theme";

export default function App() {
  useThemeEffect();
  useBootstrap();

  return (
    <TooltipProvider delayDuration={250}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="reports" element={<Navigate to="/reports/monthly" replace />} />
            <Route path="reports/monthly" element={<MonthlyReportPage />} />
            <Route path="reports/annual" element={<AnnualReportPage />} />
            <Route path="data" element={<DataPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  );
}
