# LoungeLink POS — commercial pilot release gate

## Intended offer
A locally installed POS for one gaming lounge and one trusted Windows cashier terminal. Configure room names, rates, products and business name with the owner. Do not promise remote access, multiple synchronized terminals, secure user accounts, tax compliance or cloud backups. The operator password is only a local UI lock, not server-side authentication. Owner should configure it before staff use the application; protect the Windows account and browser profile.

## Pre-delivery
Use a fresh browser profile with synthetic sales data. From the repository root using a compatible Node.js release (22.13+ recommended; verify Vite requirements), run:
```sh
npm ci
node --test tests/commercial-regressions.cjs
npm run lint
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```
If the lockfile is absent use npm install. Verify the browser at the printed local URL. Do not switch origins, ports or browser profiles on an installed terminal without exporting and restoring a verified backup; IndexedDB is origin/profile scoped.

## Acceptance checklist
- Owner creates a unique password, confirmation mismatch and wrong password are rejected; reloading locks admin mode.
- Configure business name, rates and products. Confirm all EGP currency displays and receipt totals (some legacy labels may still use USD; correct before delivery).
- Open shift with 200 cash, sell a 100 cash receipt and a 50 card receipt; actual cash 290 yields expected 300 and shortage 10. Close, reopen, sell again and verify previous shift receipts are excluded. Test across midnight.
- Start, pause, resume, finish a room session; verify duration, charge, checkout and receipt. Refresh and restart browser during a session.
- Verify inventory decrement, payment totals, receipt numbering, discount rounding and repeat-click handling. Test concurrent tabs; use one tab only unless concurrency is proven safe.
- Export backup to a separate disk. Restore on an isolated test profile; compare room, session, inventory, receipt, audit and settings records. Attempt malformed and duplicate-key backup; existing data must remain unchanged. Verify a failed transaction rolls back all stores.
- Verify persistence after restart; confirm whether the application launches and functions without internet in the selected deployment method. A production build does not prove offline operation.
- Confirm Arabic/English and RTL display, receipt printing with the customer's printer, clean first-run setup, and absence of customer-identifying demo data.
- Test with fake data only. Do not deliver if any money or data integrity check fails.

## Scope and limitations
This branch includes source-level fixes for shift boundaries, atomic backup restoration and a per-install local operator lock. Focused regression tests use repository stubs; they do not replace browser acceptance testing. No complete production build or end-to-end execution has been verified in the GitHub connector environment. Keep main unchanged until release checks pass. No payment or hosting integrations are required for the proposed local pilot.

## Support and delivery
Offer installation, initial configuration, a training session and 30 days of defect support; quote extra features separately. Agree on acceptance criteria, deposit/refund terms and delivery schedule in writing. Require daily external backups. Do not use real client data in the demo.

## Expense and room-rate upgrade (2026-11-24)
- Export a version-1 backup before updating. Close all browser/PWA windows for this origin and use the same browser profile and port. The IndexedDB migration adds an expenses store; it does not delete existing stores. Do not downgrade to database version 1 after migration.
- Owner: Settings → Individual room pricing. Set Room 1 to 60 and Room 2 to 90; save separately. Refresh and confirm only the selected room changes. Start a one-hour fixed session at 60, update that room to 75, and confirm the existing session still charges 60 while a new one charges 75. Cashier cannot change rates or access the expenses page.
- Owner: Expenses → record paid expenses with amount, category, payment source and reference. Cash drawer payments require an open shift. Payments outside the drawer affect cash flow but not expected drawer cash. Expense entry records the current time; stock quantities are updated separately. No recurring bills, unpaid balances, editing/voiding or accrual profit reporting are included in this release.
- Example: opening drawer 200, cash sales 500, drawer stock payment 100 and outside internet payment 300. Expected drawer cash = 600; total sales 500, total payments 400, net cash flow 100 (assuming all in the same reporting period). Validate the dashboard and shift summary and check the Arabic UI.
- Refresh; confirm all expenses persist. Export a new backup and restore in an isolated test profile. Verify expenses and prices survive. Older backups without expenses are refused when expense history exists; export the current backup before any restore.
- Run all four regression checks, lint and production build, then verify the updated PWA online and offline. Do not treat this source-level change as a tested production release until those checks pass. Daily/monthly reports follow the terminal's local clock. Configure the correct currency before entering real transactions and do not switch currency mid-history.
