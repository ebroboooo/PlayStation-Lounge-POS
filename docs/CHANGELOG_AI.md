# AI Changelog

Log of AI-assisted sessions under the NIKE99 workflow.

---

## 2026-07-11 — Production Readiness Sprint Step 1

**Scope:** Three roadmap features + `.cursorignore` (module-scoped, no unrelated refactoring)

### Added
- `.cursorignore` — excludes dependencies, build outputs, caches, IDE folders, logs, temp files, archives, coverage

### Changed — Feature 1: Remove Item From Active Session
- `RoomsView.tsx` — manage-items modal shows session items with minus (−1) and trash (remove all) controls; quick-remove on active room cards
- `CheckoutModal.tsx` — remove controls on item list during checkout (restores inventory via existing `SessionService.removeSessionItem`)

### Changed — Feature 2: Professional Checkout Workflow
- `CheckoutModal.tsx` — replaced single checkout button with **Print & Checkout** (auto-prints after finalize) and **Checkout Without Printing** (closes immediately)
- Added `isProcessing` guard to prevent double-submit

### Changed — Feature 3: Opening Cash / Start of Day
- `Header.tsx` — auto-opens shift modal when no shift active after load; displays opening cash amount and shift open time
- `ShiftModal.tsx` — `required` prop hides cancel on start-of-day; uses `startOfDay` i18n keys
- `App.tsx` — backdrop overlay when shift is closed

### Changed — i18n
- `TranslationContext.tsx` — keys: `removeItem`, `sessionItems`, `manageItems`, `printAndCheckout`, `checkoutWithoutPrinting`, `checkoutSuccess`, `finishAndClose`, `startOfDay`, `startOfDayDesc`, `shiftOpenSince`

### Result
- `npm run build` — pass (TypeScript + Vite; 1 CSS `@import` warning)
- `npm run lint` — 0 errors (warnings only, pre-existing)
- Offline-first behavior preserved; audit logging unchanged

### Not changed (per roadmap override)
- Lint cleanup, dead file removal, inventory i18n, shift report date logic, general refactoring

---

## 2026-07-08 — Full Project Audit

**Scope:** Documentation & analysis only (no application code changes)

### Added
- `PROJECT_AUDIT.md` — complete project audit report
- `docs/AI_REFERENCE.md` — architecture reference (bootstrapped; did not exist prior)
- `docs/PROJECT_STATUS.md` — module status tracker (bootstrapped)
- `docs/CHANGELOG_AI.md` — this file (bootstrapped)

### Findings (summary)
- 11 critical React Hook errors in `CheckoutModal.tsx`
- 43 oxlint warnings (mostly unused imports/variables)
- 2 dead files: `src/App.css`, `public/icons.svg`
- Inventory category / translation key mismatch
- Duplicate code in POSContext backup reload, formatDuration helpers, receipt print markup
- Naming inconsistency across repo, package, README, and UI branding

### Not changed
- No source code modifications
- No dependency upgrades
- No database or Firebase changes

---

## 2026-07-08 — Fix CheckoutModal React Hook Violations

**Scope:** Single module — `src/components/CheckoutModal.tsx`

### Changed
- Moved `if (!session) return null` to **after** all hook declarations
- Added `if (!session) return` guard inside the billing `useEffect`
- Switched session-dependent `useState` initializers to lazy functions with optional chaining (`session?.…`)

### Result
- 11 `react-hooks/rules-of-hooks` errors eliminated
- `npm run lint` — 0 errors (warnings only)
- `npm run build` — pass (TypeScript + Vite)
- UI, state, effects, and runtime behavior unchanged
