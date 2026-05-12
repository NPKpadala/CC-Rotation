# Changes — v1.4 (Sahsra CC Rotations)

## ⚠ Required setup steps

```powershell
npm install
npx prisma generate
npx prisma migrate dev --name v1_4_txnid_softdelete_sahsra
# OR if migrations are out of sync:
npx prisma db push

# Optional backfill (re-runs v1.3 backfill if needed)
$env:RUN_CARD_BACKFILL="true"; npm run db:seed

npm run dev
```

## Rebrand

- **App name**: "CC Rotation Ledger" → **"Sahsra CC Rotations"**
- All references swapped: sidebar, header, footer, login page, layout metadata, seed company name, BillPaymentForm default, package.json npm name + version (1.4.0).

## Section A — Correctness fixes

### A1. Bill payment pending formula — FIXED
The old v1.2/v1.3 formula used swipe-recovery math, which was wrong for bill payments. Replaced with:
```
totalPayable         = paidAmount + charges + siteCharges
customerTodayPending = max(totalPayable − (clearedTotal + alreadyCleared), 0)
isCleared            = customerTodayPending <= 0.01
```
Implementation:
- `lib/calculations.ts:computeBillPaymentPending()` — server source of truth
- `lib/calc-shared.ts:computeBillPaymentPendingPreview()` — client mirror (live preview)
- `actions/billPayment.actions.ts` — both create + update now use the corrected formula
- `BillPaymentForm.tsx` live calculation panel uses the new helper. The big bottom box shows the corrected number; status transitions to CLEARED only when it ≤ 0.01.

### A2. Profit formula — FIXED (per your spec)
```
Profit = Charges + Extra Swiped Charges − Our Charges
```
(siteCharges is NOT subtracted, per your explicit correction.)
- `lib/calculations.ts:computeProfit({charges, extraSwipedCharges, ourCharges})`
- For bill payments: `ourCharges = 0`, so profit = charges + extraSwipedCharges
- For ARD swipes: `ourCharges = ardOurCharges`, profit = charges − ourCharges (where charges already includes extra)
- Persisted to `Transaction.profit` on every create/update for both types

### A3. Human-readable transaction ID — `CC-YYYYMMDD-NNNN`
- Schema: new `Transaction.transactionId String? @unique`
- Schema: new `DailyCounter { date String @id, lastSeq Int, updatedAt DateTime }` table
- `lib/transactionId.ts:generateTransactionId(tx, date)` — atomic upsert inside a Prisma transaction guarantees no duplicates under concurrent inserts
- Format: `CC-` + 8-digit date + `-` + 4-digit daily sequence (e.g. `CC-20260509-0042`)
- Generated for every new transaction (bill payment + both swipe paths)
- Displayed on:
  - Payments list table (new first column, monospace, primary color)
  - Swiping ARD sheet (new column after S.NO)
  - Receipt slip header (large)
  - WhatsApp share template
- Searchable via Ctrl+K command palette and the `/api/search` endpoint

### A4. (Partial) Created/Updated timestamps
- Schema already had `createdAt` + `updatedAt` (no change needed)
- **Visible on**: receipt slip footer ("Recorded by X · timestamp")
- **Deferred to v1.5**: explicit Created/Last Updated rows on profile/card/transaction detail pages, toggleable "Created At" column on list pages

## Section B — UX upgrades

### B1. Split "+" button (no remove chips, per your instruction)
- New component `components/forms/SplitAmountInput.tsx`
- Wired into BillPaymentForm: Paid Amount + Swipe Amount inputs
- Below the input: parsed parts shown as static (non-removable) chips + live total
- "Split" button appends `+0` to the current value
- Existing `calculateSplitTotal()` parser handles `500+7000+2500` correctly

### B2. Payment Gateway OTHER → custom text
- New component `components/forms/GatewaySelect.tsx`
- When user picks `OTHER`, an inline text input appears (≤ 40 chars)
- Submits the typed name as the value (instead of literal "OTHER")
- Wired into BillPaymentForm (paymentGateway + swipeGateway) and ArdSwipeForm (swipeGateway)
- Zod schemas already accept arbitrary strings here — no schema change needed

### B3. New transaction chooser
- New route `/transactions/new` — two-card chooser (Bill Payment / ARD Swipe)
- Shows today's count "N created by you today" pills per type
- Each card links to its full-page form:
  - `/transactions/bill/new` → full-page BillPaymentForm
  - `/transactions/swipe/new` → full-page ArdSwipeForm
- The existing dialog version of ArdSwipeForm stays for quick-add from `/transactions/swiping`
- Sidebar "New Transaction" implicit via Ctrl+N (see C1)
- Keyboard tip displayed at the bottom of the chooser

### B4. Card number visibility — verified
Auditing every place a card is displayed, card numbers render via `formatCardNumberDisplay()` in 4-digit groups. Existing v1.3 implementation preserved:
- `CardTile.tsx` — full PAN visible inline with copy button
- `/cards/[cardId]` — large display + copy button
- Card dropdowns in BillPaymentForm + ArdSwipeForm — show full number
- Profile list "Card Full Number" search — works
- ARD swipe sheet "CARD #" column — full number
- Slip page — uses last 4 only (brevity for receipts)

## Section C — Power-user polish

### C1. Global keyboard shortcuts
- New hook `lib/hooks/useGlobalShortcuts.ts`
- `Ctrl/Cmd + K` → opens command palette
- `Ctrl/Cmd + N` → navigates to `/transactions/new` chooser
- `Ctrl/Cmd + Enter` → submits the focused form
- `Esc` → closes any open dialog (Radix handles natively)
- Mounted globally via `<CommandPalette />` inside `(app)/layout.tsx`

### C2. Auto-save draft
- New hook `lib/hooks/useAutoSaveDraft.ts`
- Saves form state to `localStorage` every 5s (debounced)
- Key format: `draft:{formId}:{userId}`
- On mount, if a draft < 24h old exists, shows a non-blocking toast: *"Unsaved draft from 14 min ago — Restore / Discard"*
- Available for use by BillPaymentForm, ArdSwipeForm, ProfileCreateForm. Hook is built and exported.
- **NB**: hook is available; explicit wiring into every form is deferred to v1.5 to avoid touching the working save flow. To enable on any form, import + call with form state, then call `clearDraft()` on successful submit.

### C3. Command palette
- New component `components/shared/CommandPalette.tsx`
- Triggered by Ctrl+K (or via `useGlobalShortcuts`)
- Searches via `/api/search?q=…` (new endpoint at `app/api/search/route.ts`)
- Returns mixed results: transactions (by txnId/name/mobile), profiles (by name/mobile/aadhaar/pan), cards (by last4/full/bank)
- Arrow nav, Enter selects, Esc closes
- Result icons by type · debounced 180ms
- Auth-gated; capped at 20 results, transaction-first ordering

### C4. Receipt slip print view
- New route `/transactions/[id]/slip`
- A5 print-optimized layout (`@page { size: A5; margin: 10mm }` via inline style)
- Shows: txnId, type badge, status badge, date, customer, card display, amounts breakdown, cleared breakdown (bill payments), pending box, profit (admin only), remarks, footer with NPKpadala
- "Print" button uses browser print (no pdf-lib roundtrip needed — printer dialog handles it)
- "Share via WhatsApp" button
- Hides nav chrome under `@media print`
- Accepts either Transaction.id OR Transaction.transactionId in the URL

### C5. WhatsApp share v2
- New component `components/shared/WhatsAppShareButton.tsx`
- Editable message dialog with template variables: `{transaction_id}`, `{customer_name}`, `{date}`, `{last4}`, `{amount}`, `{charges}`, `{cleared}`, `{status}`, `{company_name}`
- Two buttons: "Copy only" + "Copy & Send via WhatsApp" (opens wa.me/91...)
- Used on receipt slip page
- `SuccessCopyPopup` template also updated to include `{transaction_id}`
- `prisma/seed.ts` template includes the new placeholder by default

### C6. (Deferred) Bulk Excel import — v1.5
### C7. (Deferred) Dashboard widgets — v1.5
### C8. (Deferred) Profile quick-view drawer — v1.5

## Section D — Data integrity

### D1. Soft delete on Transaction
- Schema: `Transaction.deletedAt DateTime?` + `deletedById String?` + relation on User
- Schema: `@@index([deletedAt])` for filtered query speed
- `actions/billPayment.actions.ts:deleteBillPayment()` — now sets `deletedAt + deletedById` instead of hard delete; audit-logged
- New actions: `restoreTransaction(id)` and `permanentDeleteTransaction(id, confirmId)`
  - Permanent delete requires `confirmId` to match either `transaction.id` or `transaction.transactionId`
- New page `/admin/trash` (admin-only, hidden for employees)
  - Lists all soft-deleted transactions with deletedOn / deletedBy
  - "Restore" button — brings it back with same transactionId
  - "Delete" button — opens confirm dialog requiring user to type the transaction ID exactly
- Sidebar: new "Trash" item under Admin section
- Main payments + swiping lists filter by `deletedAt: null` automatically

### D2. (Deferred) Optimistic locking — v1.5 (production hardening, not demo-visible)
### D3. (Deferred) Audit log diff viewer upgrade — v1.5 (current viewer works)
### D4. (Deferred) Encryption key rotation CLI — v1.5

## Section E — Reporting (Deferred to v1.5)
Existing Excel + PDF exports from v1.0 still work. The v1.4 prompt's Excel/PDF v2 (with live SUMIFS formulas, branded headers, multi-sheet layout) deferred.

## Section F — Mobile/PWA (Deferred to v1.5)
App is mobile-responsive (works at 320px+). PWA setup with service worker + install prompt deferred.

## Section H — Acceptance tests (manual)

Run these manually after migration:

| # | Test | Expected |
|---|---|---|
| H1 | Create bill payment: due 10000, paid 10000, charges 250, siteCharges 50, cleared 0 | status PENDING, customerTodayPending = 10300, profit = 250 |
| H2 | Same as H1 with cleared 10300 | status CLEARED, customerTodayPending = 0 |
| H3 | Generate 3 transactions today | txnIds = CC-YYYYMMDD-0001, -0002, -0003 (no gaps) |
| H4 | EMPLOYEE tries to edit profile oldPendings | Field disabled, server rejects |
| H5 | Soft delete a transaction → check Trash → Restore | Reappears in main list with same txnId |
| H6 | Permanent delete from Trash with wrong confirm text | Rejected with "must match" error |
| H7 | Press Ctrl+K, type a customer name | Palette shows matches; Enter navigates |
| H8 | Press Ctrl+N | Lands on /transactions/new chooser |
| H9 | Open a transaction's slip page | Print preview shows A5 layout with txnId large + profit hidden if employee |
| H10 | Pick OTHER in Payment Gateway dropdown | Inline text field appears; entered value saved verbatim |

## Files added / modified

### Added
- `lib/transactionId.ts`
- `lib/hooks/useGlobalShortcuts.ts`
- `lib/hooks/useAutoSaveDraft.ts`
- `components/forms/SplitAmountInput.tsx`
- `components/forms/GatewaySelect.tsx`
- `components/shared/CommandPalette.tsx`
- `components/shared/WhatsAppShareButton.tsx`
- `components/admin/TrashRowActions.tsx`
- `app/api/search/route.ts`
- `app/(app)/transactions/new/page.tsx`
- `app/(app)/transactions/bill/new/page.tsx`
- `app/(app)/transactions/swipe/new/page.tsx`
- `app/(app)/transactions/[id]/slip/page.tsx`
- `app/(app)/admin/trash/page.tsx`

### Modified
- `prisma/schema.prisma` — `transactionId`, `deletedAt`, `deletedById`, `DailyCounter`, indexes
- `prisma/seed.ts` — WhatsApp template includes `{transaction_id}`
- `lib/calculations.ts` — `computeBillPaymentPending`, `computeProfit`, ARD profit corrected
- `lib/calc-shared.ts` — client-safe mirrors
- `actions/billPayment.actions.ts` — formula fix, transactionId, profit, soft delete, restore, permanent delete
- `actions/swiping.actions.ts` — transactionId for both swipe paths
- `components/forms/BillPaymentForm.tsx` — SplitAmountInput, GatewaySelect, new pending formula, transactionId in popup
- `components/forms/ArdSwipeForm.tsx` — GatewaySelect
- `components/shared/SuccessCopyPopup.tsx` — `{transaction_id}` template variable
- `components/layout/Sidebar.tsx` — Trash nav item, v1.4.0
- `app/(app)/layout.tsx` — CommandPalette mounted
- `app/(app)/transactions/payments/page.tsx` — Txn ID column, slip link, soft-delete filter
- `app/(app)/transactions/swiping/page.tsx` — Txn ID column, soft-delete filter
- `package.json` — version 1.4.0, name `sahsra-cc-rotations`
- All brand strings: `CC Rotation Ledger` → `Sahsra CC Rotations`

## Deferred to v1.5 (request when ready)

| ID | Feature | Reason |
|---|---|---|
| C6 | Bulk Excel import | Needs preview UI + row-level validation flow — a full feature on its own |
| C7 | Dashboard widget enrichments | Current dashboard works; widgets are demo polish |
| C8 | Profile quick-view drawer | Saves one click; navigation already works |
| D2 | Optimistic locking | Production hardening, invisible to demo |
| D3 | Audit log diff viewer upgrade | Current viewer renders before/after JSON |
| D4 | Encryption key rotation CLI | One-off script, not user-facing |
| E1 | Excel v2 (live formulas, multi-sheet, branded) | Current export with values works |
| E2 | PDF v2 (branded header, totals row) | Current export works |
| E3 | Scheduled email reports | Explicitly feature-flagged in spec |
| F1 | PWA install + service worker | Needs offline-shell testing |
| F2 | Full mobile pass | App is responsive already |
| A4-extended | Created/Updated row on every detail page + toggleable column | Visible on slip page only for now |
| H-tests | Automated test suite | Run manually using the table above |

## Demo highlights for client

1. **Rebrand** — header, footer, login, browser tab all say "Sahsra CC Rotations"
2. **Bill payment with corrected formula** — record one with charges + siteCharges; see customerTodayPending compute correctly
3. **Transaction ID** — point to the `CC-YYYYMMDD-NNNN` column on the payments list and ARD sheet
4. **Ctrl+K palette** — type a customer name, see mixed results, Enter to navigate
5. **Ctrl+N chooser** — fast jump to new transaction
6. **Split "+" button** — type 500, click Split, type 7000, click Split, type 2500; total updates live, no chips can be removed
7. **OTHER gateway custom text** — pick OTHER in Payment Gateway dropdown, type "GooglePayBusiness", save → the literal name is stored
8. **Soft delete + Trash** — delete a transaction, point to it in /admin/trash, click Restore
9. **Receipt slip print** — open `/transactions/{id}/slip`, Ctrl+P, see A5 layout
10. **WhatsApp share v2** — click "Share via WhatsApp" on slip → editable preview → "Copy & Send"
