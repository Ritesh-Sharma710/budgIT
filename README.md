# budgIT — Personal Budget, Expense & Savings Tracker

A modern, privacy-first personal finance tracker. Record income and expenses, plan monthly
budgets, fund savings goals, and read your money back through interactive dashboards and
monthly/annual reports.

Everything is **local-first**: your financial data lives in your own browser (IndexedDB) and is
never uploaded anywhere unless you explicitly choose the Google Sheets storage mode (coming in
Phase 6). There is no account, no backend and no analytics on your data.

> The original product specification this project is built against lives in
> [`docs/SPEC.md`](docs/SPEC.md).

---

## Status

| Phase | Scope | State |
| ----- | ----- | ----- |
| 1 | Repository inspection & implementation plan | ✅ |
| 2 | Financial data model, calculation rules, storage abstraction | ✅ |
| 3 | Responsive dashboard, navigation, transactions, budgets, savings goals | ✅ |
| 4 | Interactive charts, monthly & annual reports | ✅ |
| 5 | Local persistence hardening, import/export, backup/restore | 🚧 data & privacy screen done (JSON backup, CSV, demo data, erase) |
| 6 | Google OAuth + Google Sheets sync | ⏳ not started (by request) |
| 7 | Testing, accessibility, responsive polish, docs | 🚧 ongoing |

Authentication is intentionally **not** implemented yet, per the project owner's instruction.

---

## Tech stack

| Concern | Choice |
| ------- | ------ |
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (CSS-first config) + shadcn-style primitives |
| Components | Radix UI primitives, hand-rolled in `src/components/ui` |
| Charts | Recharts 3 |
| Local persistence | IndexedDB via Dexie 4 |
| State | Zustand (UI preferences) + Dexie live queries (financial data) |
| Notifications | Sonner (touch-friendly toasts, visible on mobile) |
| Dates | Custom timezone-safe helpers (`src/lib/date.ts`) |
| CSV | PapaParse |
| Tests | Vitest + Testing Library + jsdom |

## Getting started

Requires **Node 20.11+** (Node 24 recommended).

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production bundle
npm run preview    # preview the production build
npm run typecheck  # tsc project references, no emit
npm test           # run the unit test suite once
npm run test:watch # watch mode
```

No environment variables are required for local mode. Google Sheets credentials (Phase 6) will be
documented here when implemented.

---

## Architecture

```
src/
├── domain/            # Pure business logic — no React, no storage, no network
│   ├── types.ts       # Typed domain model (single source of truth)
│   ├── constants.ts   # Default categories, payment methods, widget metadata
│   ├── calculations.ts# Aggregation, savings rate, budgets, goals, trends
│   ├── validation.ts  # Form / import validation rules
│   └── dedupe.ts      # Duplicate detection signatures
├── lib/               # Small, dependency-free helpers
│   ├── date.ts        # Timezone-safe calendar + month arithmetic
│   ├── money.ts       # Rounding, currency formatting (₹), safe maths
│   ├── id.ts          # Stable, opaque ID generation
│   └── utils.ts       # cn(), misc
├── data/              # Persistence — the only layer that touches storage
│   ├── db.ts          # Dexie / IndexedDB schema
│   ├── repositories.ts# Typed CRUD per entity
│   ├── backup.ts      # Export / preview / import / erase
│   ├── csv.ts         # CSV import & export
│   ├── demo.ts        # Optional, clearly-labelled, removable demo data
│   └── storage/       # StorageAdapter abstraction (local now, Sheets later)
├── state/             # Zustand stores + Dexie live-query hooks
├── components/        # ui/ (primitives), layout/, charts/, dashboard/, ...
├── pages/             # Route-level screens
└── test/              # Vitest setup
```

**Separation of concerns:** UI components never talk to Dexie or the network directly. Pages
depend on hooks in `state/`, hooks depend on `data/repositories`, and all arithmetic comes from
`domain/calculations`. That makes the numbers unit-testable and keeps a future Google Sheets
adapter a drop-in replacement behind the same vocabulary.

### Financial rules (implemented once, in `domain/calculations.ts`)

- **Net savings** = total income − total expenses.
- **Savings rate** = net savings ÷ income × 100, or *null* (rendered as `—`) when income is 0.
- **Budget remaining** = monthly budget − actual expenses.
- **Annual net savings** = annual income − annual expenses.
- **Savings & investment contributions** and **transfers** are tracked separately and are **not**
  counted as consumption expenses, so savings are never double-counted. A setting can fold
  contributions into expenses for users who prefer that view.
- Categories without a configured budget are **never** treated as a zero budget — they show
  "no budget set" instead of a false 100% overrun.

### Data & privacy

- **Local mode** uses IndexedDB (Dexie). `localStorage` is only used for small UI preferences.
- Nothing is uploaded. There is no telemetry.
- Local data lives in one browser profile on one device — the UI says so plainly, and provides
  JSON export/import plus CSV as a portable backup that is never locked into the app.
- Browser storage is **not** automatically encrypted; the app does not claim otherwise.
- "Erase all local data" is available in Settings → Data.

---

## Testing

```bash
npm test
```

63 unit tests currently cover the calculation engine (monthly/annual aggregation, savings rate
with zero income, negative savings, month/year boundaries, leap years, budget thresholds, goal
progress, daily series, month-over-month comparison), currency rounding/formatting, timezone-safe
date maths, and duplicate detection.

---

## Licence

See [LICENSE](LICENSE).
