# AI Reference — PlayStation Lounge POS

> Source of truth for AI-assisted development under the NIKE99 workflow.

## Project Identity

| Field | Value |
|-------|-------|
| Folder | `PlayStation-Lounge-POS` |
| npm name | `villa30-pos` |
| Product | Villa 30 PlayStation Lounge POS (offline-first) |
| Stack | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, IndexedDB |

## Architecture

```
main.tsx
  └── RoleProvider
        └── TranslationProvider
              └── App (POSProvider)
                    ├── Header (+ ShiftModal)
                    ├── Sidebar
                    └── View (tab switch)
                          ├── RoomsView (+ CheckoutModal)
                          ├── DashboardView
                          ├── InventoryView
                          ├── ReceiptsView
                          ├── AuditLogsView (admin only)
                          └── SettingsView (admin only)
```

### Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| Views | `src/components/` | UI; consume context hooks only |
| Context | `src/context/` | Global state, orchestration |
| Services | `src/services/` | Business logic (sessions, reports, backups) |
| Repositories | `src/repositories/` | IndexedDB CRUD per entity |
| Database | `src/db/db.ts` | IndexedDB schema, seed data |
| Types | `src/types/index.ts` | Shared TypeScript interfaces |

### Data Stores (IndexedDB — `Villa30POS`)

`settings`, `rooms`, `sessions`, `inventory`, `receipts`, `audit_logs`, `backups`

### Context Hooks

| Hook | Provider | Purpose |
|------|----------|---------|
| `usePOS()` | `POSContext` | Rooms, sessions, inventory, receipts, shifts, backups |
| `useTranslation()` | `TranslationContext` | i18n (en/ar), RTL |
| `useRole()` | `RoleContext` | admin/cashier role & permissions |

There is no separate `src/hooks/` directory.

## Development Standards

### Scope Rules (NIKE99)

- Work on **one module** at a time
- No architecture redesign without explicit approval
- No new features during cleanup/refactor passes
- Keep diffs small (target ≤ 8 code files)
- Update `PROJECT_STATUS.md` and `CHANGELOG_AI.md` after each AI session

### Code Conventions

- Functional React components with TypeScript
- Tailwind utility classes; global styles in `index.css`
- Lucide React for icons
- Repository pattern for all persistence
- Audit logging via `AuditLogRepository.log()` on state-changing operations
- Role permissions enforced in UI (`useRole`) and view routing (`App.tsx`)

### Commands

```bash
npm run dev      # Vite dev server (port 5173)
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm run preview  # Preview production build
```

### Known Constraints

- Offline-first; no Firebase or external API
- Admin password is hardcoded (`admin30`) — demo/dev only
- Shift stored in `localStorage` (`v30_pos_shift`), not IndexedDB
- PWA service worker registered in production only (`main.tsx`)
- Start-of-day requires opening cash before POS operations (mandatory shift modal)

## Production Readiness — Step 1 (2026-07-11)

| Feature | Location | Behavior |
|---------|----------|----------|
| Remove item from session | `RoomsView.tsx`, `CheckoutModal.tsx` | Minus removes 1 qty; trash removes all; stock restored via `SessionService.removeSessionItem` |
| Print & Checkout | `CheckoutModal.tsx` | Dual checkout buttons; print path auto-triggers `window.print()` after receipt finalize |
| Checkout without printing | `CheckoutModal.tsx` | Completes checkout and closes modal immediately |
| Opening cash / Start of day | `Header.tsx`, `ShiftModal.tsx`, `App.tsx` | Auto-opens required shift modal on load; overlay blocks UI; header shows opening cash & shift open time |


## Key Files

| File | Notes |
|------|-------|
| `src/context/POSContext.tsx` | Central state orchestrator (~490 lines) |
| `src/services/SessionService.ts` | Session lifecycle & charge calculation |
| `src/db/db.ts` | DB schema + seed rooms/inventory |
| `src/context/TranslationContext.tsx` | All UI translation strings |
| `public/service-worker.js` | PWA offline shell caching |

## Documentation Map

| File | Purpose |
|------|---------|
| `docs/AI_REFERENCE.md` | This file — architecture & standards |
| `docs/PROJECT_STATUS.md` | Current module status & blockers |
| `docs/CHANGELOG_AI.md` | AI session change log |
| `PROJECT_AUDIT.md` | Full project audit (2026-07-08) |
