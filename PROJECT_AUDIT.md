# Project Audit Report

**Project:** PlayStation-Lounge-POS (package name: `villa30-pos`)  
**Audit date:** 2026-07-08  
**Scope:** Full codebase static analysis — no application code modified  
**Auditor:** NIKE99 AI workflow  

---

## Executive Summary

The project is a small, well-structured offline-first React POS app (~43 source files). The production build succeeds (`tsc -b && vite build`), but **oxlint reports 11 critical React Hook violations** in `CheckoutModal.tsx` and **43 lint warnings**, mostly unused imports and variables. There is no `docs/` folder yet (NIKE99 reference docs were missing at audit time and are being bootstrapped). Several dead files, naming inconsistencies, and duplicate helper logic were identified as safe cleanup targets.

| Metric | Result |
|--------|--------|
| TypeScript errors | **0** (build passes) |
| ESLint (oxlint) errors | **11** |
| ESLint (oxlint) warnings | **43** |
| TODO / FIXME comments | **0** |
| Build CSS warnings | **1** (`@import` order) |
| Custom hooks folder | **None** (hooks live in context files) |
| Test suite | **None** |

---

## 1. Critical Issues

### 1.1 React Hooks Rule Violations — `CheckoutModal.tsx`

**Severity:** Critical  
**File:** `src/components/CheckoutModal.tsx` (lines 17–18, 21–37)

The component returns early when no active session exists **before** calling `useState` and `useEffect`:

```tsx
const session = activeSessions[room.id];
if (!session) return null;

const [discountVal, setDiscountVal] = useState<number>(...);
// ... 9 more useState calls + 1 useEffect
```

Oxlint reports **11 `react-hooks/rules-of-hooks` errors**. This violates React's Rules of Hooks and can cause runtime crashes or inconsistent state if the modal mounts/unmounts while session data changes.

**Recommended fix:** Move all hooks above the early return, or split into a wrapper component that conditionally renders an inner component only when `session` exists.

---

### 1.2 Hardcoded Admin Credentials in UI

**Severity:** Critical (security)  
**File:** `src/components/Header.tsx` (lines 50, 168)

Admin role is gated by the hardcoded password `admin30`, which is also displayed in the password prompt UI. This is a development placeholder, not production-safe access control.

**Recommended fix:** Treat as a known limitation for offline demo use; document clearly. Do not expose default credentials in UI for production deployments.

---

### 1.3 Inventory Category / Translation Mismatch

**Severity:** Critical (data integrity / i18n)  
**Files:** `src/types/index.ts`, `src/context/TranslationContext.tsx`, `src/components/InventoryView.tsx`

| Source | Categories defined |
|--------|-------------------|
| `ItemCategory` type | `Snacks`, `Bar`, `Hot Drinks`, `Cold Drinks` |
| Translation keys | `Drinks`, `Snacks`, `Food`, `Accessories` |

Categories `Bar`, `Hot Drinks`, and `Cold Drinks` have **no translation entries**. Keys `Drinks`, `Food`, and `Accessories` are **never used** in the type system. UI calls `t(category)` and will show raw keys for untranslated categories.

---

### 1.4 Shift Report Logic Uses Calendar Day, Not Shift Window

**Severity:** Critical (business logic accuracy)  
**File:** `src/services/ReportService.ts` (lines 94–100)

`getCurrentShiftReport()` filters receipts by **today's date**, not by `currentShift.openTime`. A shift opened yesterday and closed today would include incorrect revenue. Comment acknowledges this: *"Let's assume today's receipts."*

This is a logic gap worth fixing in a dedicated business-logic pass (not part of this audit's scope).

---

## 2. Safe Cleanup Candidates

These changes are low-risk and do not alter behavior when removed.

### 2.1 Dead Files

| File | Reason |
|------|--------|
| `src/App.css` | Vite boilerplate CSS; **never imported** anywhere in the project |
| `public/icons.svg` | **Not referenced** in HTML, manifest, service worker, or source |

### 2.2 Unused Imports (43 lint warnings — grouped by file)

| File | Unused symbols |
|------|----------------|
| `App.tsx` | `Play`, `ShieldAlert`; unused destructured `rooms`, `t`, `language` |
| `Header.tsx` | `Shield`, `RefreshCw`, `LogOut`; `roleToSwitch` value never read (setter used) |
| `DashboardView.tsx` | `currentShift`; callback param `idx` |
| `CheckoutModal.tsx` | `Tag` |
| `AuditLogsView.tsx` | `Calendar`, `User`, `History`, `AlertTriangle` |
| `ReportService.ts` | `Receipt`, `Room`, `RoomStatus` |
| `BackupService.ts` | `Room`, `Session`, `InventoryItem`, `Receipt`, `AuditLog`, `SystemSettings` |
| `SessionService.ts` | `Room`, `InventoryItem`, `SessionItem` |
| `SettingsView.tsx` | `Sparkles`, `Check`, `X`, `AlertTriangle`; unused `role` |
| `InventoryView.tsx` | unused `role` |
| `RoomsView.tsx` | `Plus`, `Sparkles`, `ChevronRight`; unused `removeSessionItem`, `role`, `favoriteItems` |
| `ReceiptsView.tsx` | `Clipboard` |
| `RoleContext.tsx` | `useEffect` import |

### 2.3 Dead Computed Values

| Location | Symbol | Notes |
|----------|--------|-------|
| `RoomsView.tsx:43–45` | `favoriteItems` | Computed but never rendered; quick-add favorites UI appears incomplete |
| `RoomsView.tsx:19` | `removeSessionItem` | Destructured from context but never called in UI |

### 2.4 Duplicate Type Definition

`EmployeeRole` is defined in both:
- `src/types/index.ts:81`
- `src/context/RoleContext.tsx:3` (re-exported and used by components)

Consolidate to a single source in `types/index.ts`.

### 2.5 Deprecated API Usage

Three files use `String.prototype.substr()` (deprecated):
- `src/services/BackupService.ts:34`
- `src/services/SessionService.ts:91`
- `src/repositories/AuditLogRepository.ts:17`

Replace with `.substring()` or `.slice()`.

### 2.6 Unused Translation Keys

These keys exist in `TranslationContext.tsx` but are not referenced via `t()` for current `ItemCategory` values:
- `Drinks`, `Food`, `Accessories`

---

## 3. Medium Priority Improvements

### 3.1 Duplicate Code — State Reload After Backup

**File:** `src/context/POSContext.tsx`  
**Lines:** 400–418 (`restoreBackup`) and 421–438 (`importBackupFile`)

Both functions contain nearly identical post-restore reload logic (~18 lines). Extract a private `reloadAllState()` helper inside the provider.

### 3.2 Duplicate Code — `formatDuration`

Identical duration-formatting helpers exist in:
- `src/components/CheckoutModal.tsx:66`
- `src/components/ReceiptsView.tsx:28`

Extract to a shared utility (e.g. `src/utils/format.ts`) when a utils module is approved.

### 3.3 Duplicate Code — Receipt Print Markup

Three components render `#receipt-print-area` print layouts with overlapping structure:
- `CheckoutModal.tsx`
- `ReceiptsView.tsx`
- `ShiftModal.tsx`

Consolidating into a shared `ReceiptPrintLayout` component would reduce drift.

### 3.4 Duplicate Default Settings

Default `SystemSettings` values are repeated in four places:
- `src/context/POSContext.tsx:78–86`
- `src/db/db.ts:151+`
- `src/repositories/SettingRepository.ts:12+`
- Various component fallbacks (`'Villa 30'`, `'Villa 30 Lounge'`, etc.)

Centralize defaults in one constant.

### 3.5 Naming Inconsistencies

| Context | Names used |
|---------|-----------|
| Repository folder | `PlayStation-Lounge-POS` |
| npm package | `villa30-pos` |
| README title | `LoungeLink POS` |
| IndexedDB name | `Villa30POS` |
| localStorage keys | `v30_pos_shift`, `v30_pos_role` |
| Export filenames | `villa30_backup_*`, `villa30_receipts_export_*` |
| UI branding | `VILLA 30`, `Villa 30 PlayStation Lounge` |

Pick one canonical product name and key prefix convention.

### 3.6 README / Asset Gaps

- README references `screenshots/` directory and 8 images — **folder not present** in repository
- README badge says TypeScript 5; project uses **TypeScript ~6.0.2**
- README badge says React 19 / Vite — accurate

### 3.7 TypeScript Strictness Disabled

`tsconfig.app.json` has:
```json
"noUnusedLocals": false,
"noUnusedParameters": false
```

Enabling these would surface dead code at compile time and complement oxlint.

### 3.8 Build CSS Warning

Vite reports during build:

```
@import rules must precede all rules aside from @charset and @layer statements
```

**File:** `src/index.css` — Google Fonts `@import url(...)` appears after `@import "tailwindcss"`, which expands to CSS rules.

**Fix:** Move the fonts `@import` above the Tailwind import, or load fonts via `<link>` in `index.html`.

### 3.9 Console Output in Production

| File | Statement | Purpose |
|------|-----------|---------|
| `main.tsx:21–22` | `console.log` / `console.error` | Service worker registration |
| `POSContext.tsx:135,150,152` | error/log | DB init & auto-backup |
| `TranslationContext.tsx:184,197` | error | Language load/save |
| `CheckoutModal.tsx:57` | error | Checkout failure |

Consider a logging utility with environment gating for production builds.

### 3.10 ReportService Default Category

`ReportService.ts:166` hardcodes `category: 'Drinks'` for all top-selling items instead of reading from inventory data.

---

## 4. Nice-to-Have Improvements

### 4.1 Project Structure

Current layout is clean and conventional:

```
src/
├── components/     # 9 views + 2 modals (all used)
├── context/        # POSContext, TranslationContext, RoleContext (+ hooks)
├── db/             # IndexedDBManager
├── repositories/   # 6 data-access classes
├── services/       # SessionService, BackupService, ReportService
└── types/          # Shared TypeScript interfaces
```

Missing folders that could help maintainability (future):
- `src/hooks/` — none today; context hooks are inline
- `src/utils/` — would host shared formatters
- `docs/` — NIKE99 reference docs (created with this audit)
- `tests/` — no test infrastructure

### 4.2 Fast Refresh Warnings

Oxlint warns `react/only-export-components` on:
- `TranslationContext.tsx`
- `RoleContext.tsx`
- `POSContext.tsx`

These files export both providers and hooks. Splitting hooks into separate files improves HMR but is optional.

### 4.3 PWA / Service Worker

- Service worker caches only static shell assets (`/`, `/index.html`, `/logo.svg`, `/manifest.json`)
- Does not pre-cache built JS/CSS bundles by hash — relies on runtime cache-on-fetch
- `start_pos.bat` opens browser before dev server is ready (race condition on slow machines)

### 4.4 No Automated Testing or CI

- No `test` script in `package.json`
- No GitHub Actions / CI configuration detected
- No pre-commit hooks

### 4.5 Hardcoded UI Strings Outside i18n

Several user-facing strings in `Header.tsx` and `ShiftModal.tsx` are inline English/Arabic ternaries instead of using `TranslationContext` keys (e.g. admin password prompt, shift closed label).

### 4.6 Dependencies

All declared dependencies appear used:

| Package | Usage |
|---------|-------|
| `react`, `react-dom` | Core UI |
| `lucide-react` | Icons throughout components |
| `tailwindcss`, `@tailwindcss/vite` | Styling via `index.css` |

No obviously unused npm dependencies. Dev dependencies are all tooling-related.

### 4.7 Component Usage Matrix

All components are referenced and active:

| Component | Used by |
|-----------|---------|
| `Header` | `App.tsx` |
| `Sidebar` | `App.tsx` |
| `RoomsView` | `App.tsx` |
| `DashboardView` | `App.tsx` |
| `InventoryView` | `App.tsx` |
| `ReceiptsView` | `App.tsx` |
| `AuditLogsView` | `App.tsx` |
| `SettingsView` | `App.tsx` |
| `CheckoutModal` | `RoomsView.tsx` |
| `ShiftModal` | `Header.tsx` |

No orphaned components detected.

### 4.8 Repository / Service Usage

All repositories and services are imported and used through `POSContext` or view components. No dead service classes.

---

## Recommended Cleanup Order

1. **Fix `CheckoutModal` hooks violation** (critical — behavior risk)
2. **Remove dead files** (`App.css`, `icons.svg`)
3. **Strip unused imports/variables** (43 warnings → near-zero)
4. **Align inventory categories with translations**
5. **Fix CSS `@import` order** (eliminate build warning)
6. **Extract duplicated reload/format/print helpers** (medium refactor)
7. **Standardize naming and README assets** (documentation pass)

---

## Audit Methodology

- Read all 43 project files
- Ran `npm run build` — passed with 1 CSS warning
- Ran `npm run lint` (oxlint) — 11 errors, 43 warnings
- Grepped for TODO/FIXME, console statements, import graph, asset references
- Verified component/service/repository reachability from entry point (`main.tsx` → `App.tsx`)

**No application source code was modified during this audit.**
