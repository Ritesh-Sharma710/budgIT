# Project: Personal Budget, Expense & Savings Tracker

Act as a senior full-stack engineer, product designer, and software architect. Build a complete, responsive personal finance web application that enables users to track income, expenses, savings, budgets, and financial progress through interactive dashboards, charts, and monthly and annual reports.

The application should feel like a modern personal finance management tool, with a clean, data-dense interface, clear visualizations, fast interactions, and strong privacy controls.

## 1. Core Product Requirements

Build a website where each user can:

- Record and categorize income and expenses.
- Set monthly budgets and savings targets.
- Track actual spending against planned spending.
- View monthly savings, annual savings, total expenses, and total income.
- Compare financial performance across different months.
- Visualize spending patterns with interactive charts and graphs.
- Add, remove, reorder, and customize dashboard components.
- Store financial data locally on their device or in their own Google Sheets.
- Export and import financial data without being locked into the application.

Do not build a static dashboard with hardcoded numbers. Every metric, chart, transaction, and report must be driven by actual user data.

## 2. Dashboard Design

Create a professional dashboard with a sidebar navigation and a main content area.

### Main dashboard components

**A. Financial overview cards**
- Total income for the selected month.
- Total expenses for the selected month.
- Net savings for the selected month.
- Savings rate as a percentage of income.
- Remaining monthly budget.
- Total savings accumulated during the current year.
- Total income and expenses for the current year.
- Comparison with the previous month.

Use the following calculations:

- Net savings = total income − total expenses.
- Savings rate = net savings / total income × 100, when income is greater than zero.
- Budget remaining = monthly budget − actual expenses.
- Annual net savings = annual income − annual expenses.

Keep investment contributions and transfers separate from ordinary consumption expenses to avoid double-counting. Allow users to configure how these appear in their reports.

**B. Monthly selector**

Provide a month and year selector, with navigation to previous and next months.

When a user changes the selected month, update all monthly metrics, charts, transaction lists, budgets, and category breakdowns accordingly.

Provide a quick way to return to the current month.

**C. Annual financial overview**

Create a separate annual summary section containing:

- Annual total income.
- Annual total expenses.
- Annual net savings.
- Annual savings rate.
- Month-by-month income and expenses.
- Monthly savings trend.
- Highest-spending month.
- Lowest-spending month.
- Most expensive spending categories.
- Comparison with the previous year, when data is available.

Support switching between years. Do not treat missing future months as zero-spending months without making the distinction clear.

**D. Customizable dashboard widgets**

Let users add, remove, reorder, resize where practical, and configure dashboard components.

Available widgets should include:
- Income overview.
- Expense overview.
- Savings tracker.
- Budget progress.
- Category-wise expense breakdown.
- Monthly income vs. expense chart.
- Annual savings trend.
- Recent transactions.
- Upcoming recurring payments.
- Financial goals.
- Top spending categories.
- Daily spending trend.

Persist widget visibility, order, and settings in the user's local preferences or Google Sheets configuration, depending on their selected storage mode.

## 3. Charts and Visualizations

Use a charting library such as Recharts if the project uses React.

Implement the following interactive charts:

1. **Income vs. Expenses:** Grouped bar chart comparing monthly income and expenses.
2. **Savings Trend:** Line chart showing net savings across months.
3. **Expense Distribution:** Donut chart breaking expenses down by category.
4. **Budget Utilization:** Progress bars showing actual expenses against category budgets.
5. **Daily Spending:** Line or bar chart showing spending across the selected month.
6. **Annual Overview:** Monthly stacked bar chart for income and expenses, with savings shown separately where appropriate.
7. **Savings Rate:** Line chart comparing monthly savings percentages.
8. **Category Comparison:** Bar chart comparing spending categories between two selected months.

Charts must:
- Update immediately when data changes.
- Include meaningful tooltips, labels, legends, and empty states.
- Support month, year, and category filters where relevant.
- Work on mobile and desktop.
- Use consistent formatting for Indian rupees (₹), with appropriate number grouping.
- Handle negative savings, zero income, missing data, and unusually large values correctly.
- Include accessible labels and a readable color scheme.

Do not use decorative charts that are disconnected from actual data.

## 4. Transactions and Expense Management

Create a dedicated transactions page.

Each transaction should support:
- Unique transaction ID.
- Date.
- Description.
- Amount.
- Transaction type: income, expense, savings contribution, investment contribution, or transfer.
- Category and optional subcategory.
- Payment method: cash, UPI, debit card, credit card, bank transfer, or custom.
- Optional notes.
- Optional recurring transaction settings.
- Optional tags.

Provide:
- Add, edit, and delete operations.
- Search by description.
- Filter by date range, category, transaction type, and payment method.
- Sort by date and amount.
- Pagination or efficient list virtualization when needed.
- CSV import and export.
- Duplicate transaction detection during imports.
- Confirmation before deleting records.
- Validation to prevent invalid dates and amounts.

Include useful default categories such as food, groceries, transport, rent, utilities, subscriptions, education, entertainment, healthcare, shopping, travel, salary, freelance income, interest, and other.

Allow users to create, rename, and delete their own categories without corrupting historical records.

## 5. Budget Planning

Build a monthly budget planner where users can set:
- An overall spending limit.
- Individual category budgets.
- A savings target.
- Optional limits for payment methods or custom tags.

For each category, show:
- Budgeted amount.
- Amount spent.
- Remaining budget.
- Percentage utilized.

Provide configurable warning thresholds, such as 75%, 90%, and 100% utilization.

Display clear warnings when the user approaches or exceeds a budget. Do not assume a category has a zero budget when no budget has been configured.

Support copying a previous month's budget into a new month and adjusting individual categories.

## 6. Savings and Financial Goals

Create a savings goals section supporting goals such as:
- Emergency fund.
- Laptop or other purchases.
- Higher education.
- Travel.
- Vehicle.
- Long-term wealth.

Each goal should include:
- Goal name.
- Target amount.
- Current saved amount.
- Target date.
- Progress percentage.
- Required monthly contribution estimate.
- Status: on track, behind schedule, completed, or target date passed.

Allow users to update goal contributions and track historical progress.

Clearly distinguish between:
- Net monthly savings.
- Money allocated to a savings goal.
- Existing savings balance.
- Investment portfolio value.

Do not automatically add goal contributions to net savings a second time. Moving money between accounts or goals should not be counted as a new expense.

Do not present investment returns as guaranteed or treat investment contributions as consumer spending.

## 7. Data Storage Architecture and Privacy

Data ownership is a central requirement. Provide two primary storage modes.

### Mode A: Local-first storage

- Use IndexedDB for persistent transaction and financial data.
- Use a suitable wrapper such as Dexie.js if appropriate.
- Use localStorage only for small preferences, not the primary financial database.
- Support offline access and transaction creation.
- Make it clear that local data is available only in the relevant browser profile and device unless backed up.
- Provide explicit backup and restore options.
- Support exporting all financial records, budgets, goals, categories, and preferences.
- Do not upload local-mode data to an application server.
- Provide a clear action to erase locally stored data.

Do not claim that browser-local storage is automatically encrypted. If local encryption is implemented, use a well-reviewed cryptographic approach and explain the key-recovery limitations.

### Mode B: User-owned Google Sheets storage

Integrate the Google Sheets API using Google OAuth 2.0.

The user should be able to:
1. Connect their Google account.
2. Authorize access to the selected spreadsheet or create a dedicated spreadsheet.
3. Select a spreadsheet for storing their records.
4. Synchronize transactions, budgets, categories, savings goals, and application settings.
5. Load their data when they return.
6. Disconnect their Google account.
7. Export or back up their data independently.

Organize the spreadsheet into separate worksheets:
- Transactions
- Monthly Budgets
- Categories
- Savings Goals
- Monthly Snapshots, if required
- Settings

Use stable IDs for records rather than relying on spreadsheet row numbers.

Implement:
- A defined data schema and version.
- Safe update and deletion operations.
- Batch writes where possible.
- Sync status indicators.
- Last successful synchronization timestamp.
- Retry handling for transient failures.
- Google API quota and error handling.
- Duplicate prevention.
- Conflict detection when the same record changes on multiple devices.
- A clear recovery path for failed or partial synchronization.

Do not silently overwrite newer data. Define and implement a deterministic conflict-resolution strategy, with user intervention for genuine conflicts where appropriate.

Use incremental synchronization when practical rather than rewriting the entire spreadsheet after every change.

### Authentication and security requirements

- Request only the Google permissions necessary for the selected spreadsheet workflow.
- Use OAuth correctly, with appropriate state validation and secure token handling.
- Never hardcode OAuth client secrets in frontend code.
- Never expose access tokens or refresh tokens in logs, URLs, or error messages.
- Avoid sending financial data to third-party analytics or logging services.
- Do not collect credentials or financial records unnecessarily.
- Provide an option to revoke the application's Google access.
- Explain that Google Sheets storage is subject to the user's Google account and sharing permissions.

If Google Sheets requires backend functionality for secure OAuth or token handling, implement a minimal, well-defined backend rather than introducing unnecessary infrastructure.

### Switching between storage modes

Allow users to migrate from local storage to Google Sheets and back.

Before migration:
- Preview the records being migrated.
- Detect duplicate IDs and conflicting records.
- Require explicit confirmation.
- Preserve the source data until the destination has been verified.
- Provide export and rollback options.

Never imply that browser-local data automatically follows a user to a different device.

## 8. Monthly and Annual Reporting

Implement a reporting engine that calculates results from the underlying transaction records.

The monthly report should show:
- Income, expenses, and net savings.
- Savings rate.
- Budget utilization.
- Category breakdown.
- Largest transactions.
- Recurring expenses.
- Comparison against the previous month.

The annual report should show:
- Total annual income, expenses, and net savings.
- Average monthly income and expenses.
- Monthly savings rates.
- Category-wise annual totals.
- Annual goal progress.
- Month-over-month changes.
- Comparison with the previous year, where comparable data exists.

Make financial calculations reusable and independent of the UI.

Use explicit date boundaries and consistent timezone handling to avoid transactions appearing in the wrong month. Handle leap years and transactions entered after a month has ended.

## 9. UI/UX and Responsive Design

Create a polished personal finance interface.

Design direction:
- Minimal, modern, professional.
- Light and dark themes.
- Consistent spacing, typography, and chart styling.
- Sidebar navigation on desktop.
- Collapsible navigation and appropriately arranged cards on mobile.
- Responsive tables or transaction cards for small screens.
- Clear empty states for new users.
- Skeleton loading states where asynchronous loading occurs.
- Useful validation and error messages.
- Keyboard-accessible controls and dialogs.
- Accessible contrast and focus indicators.

Suggested navigation:
- Dashboard
- Transactions
- Budgets
- Savings Goals
- Monthly Reports
- Annual Reports
- Google Sheets & Data
- Settings

Provide a first-run setup flow where users choose a currency, enter their approximate monthly income, set a starting budget, and select local storage or Google Sheets.

Use INR as the default currency, but allow users to change it.

Avoid excessive gradients, unnecessary animation, and decorative elements that reduce information density.

## 10. Technical Implementation

First inspect the existing repository, framework, package manager, and coding conventions. Preserve existing working functionality.

If starting from scratch, use a maintainable stack such as:
- React with TypeScript.
- Vite or the project's existing compatible build tool.
- Tailwind CSS.
- shadcn/ui for reusable components.
- Recharts for data visualization.
- IndexedDB with Dexie.js for local-first persistence.
- Google Sheets API with Google OAuth for optional user-owned cloud storage.
- A minimal backend only where secure OAuth or other server functionality genuinely requires it.

Keep the architecture modular.

Suggested modules:
- `transactions`
- `budgets`
- `categories`
- `savings-goals`
- `analytics`
- `charts`
- `storage`
- `google-sheets`
- `reports`
- `settings`

Create a typed domain model and centralized financial calculation functions.

Separate:
- UI components.
- Business logic.
- Data persistence.
- Google integration.
- Reporting and analytics.

Do not place all logic inside a single component. Avoid unnecessary dependencies and avoid introducing a complex server/database architecture when local-first storage meets the requirements.

## 11. Testing and Correctness

Test at minimum:
- Creating, editing, and deleting transactions.
- Correct monthly and annual aggregation.
- Budget calculations and threshold warnings.
- Savings-rate calculations when income is zero.
- Negative net savings.
- Transactions crossing month and year boundaries.
- Recurring transaction generation without duplicates.
- Import/export correctness.
- Local data persistence after refresh.
- Google Sheets synchronization and failure recovery.
- Duplicate and conflicting transaction handling.
- Storage migration and backup restoration.
- Mobile layout and chart responsiveness.

Use automated unit tests for financial calculations and integration tests for persistence and synchronization.

Never use fabricated sample transactions in production dashboards. Optional demo data must be clearly marked and removable.

## 12. Implementation Workflow

Work in the following order:

Phase 1: Inspect the repository and propose a concise implementation plan. Identify existing components and dependencies worth reusing.

Phase 2: Define the financial data model, calculation rules, and storage abstraction.

Phase 3: Build the responsive dashboard, navigation, transaction management, budgets, and savings goals.

Phase 4: Implement interactive charts and monthly and annual reports using real application data.

Phase 5: Implement local persistence, import/export, and backup/restore.

Phase 6: Implement Google OAuth and Google Sheets synchronization, including failure handling and migration.

Phase 7: Add testing, accessibility improvements, responsive refinements, and setup documentation.

After each phase, run the relevant tests and fix errors before proceeding.

Do not stop after generating a plan or creating a visually impressive mockup. Continue implementing the application, run it, verify its functionality, and report any incomplete features or required external configuration.

## 13. Acceptance Criteria

The application is complete only when:
- A user can create an account-independent local budget without needing a backend.
- Transactions survive browser refreshes in local mode.
- All dashboard cards and charts update from actual stored records.
- Monthly and annual totals reconcile with the underlying transactions.
- Users can manage budgets and savings goals.
- Data can be exported, restored, and migrated.
- Google Sheets integration works with properly configured OAuth credentials.
- Sync failures are visible and recoverable.
- The application works on desktop and mobile.
- No financial data is silently uploaded in local-only mode.
- Setup instructions explain environment variables, OAuth configuration, storage limitations, and testing.

Begin by inspecting the current codebase. Then implement the application incrementally, prioritizing correctness, data privacy, maintainability, and a fully functional user experience.