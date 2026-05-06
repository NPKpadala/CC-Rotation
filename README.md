# Credit Card Rotation & Ledger Tracking Portal

> ⚠️ **Demo / internal tool only.** This is a manual data ledger. It does **not** process real payments, connect to banks, or integrate with any payment gateway.

## Stack
- Next.js 14 (App Router) · React 18 · TypeScript
- TailwindCSS + shadcn-style components · Lucide icons
- React Hook Form + Zod
- Prisma ORM + PostgreSQL
- NextAuth (Credentials + JWT) · bcryptjs
- Sonner (toasts) · Recharts · Date-fns

## Setup
```bash
npm install
cp .env.example .env.local   # fill DATABASE_URL + NEXTAUTH_SECRET
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```
Visit http://localhost:3000

## Demo accounts
| Role | Email | Password |
|---|---|---|
| ADMIN | admin@demo.com | admin123 |
| EMPLOYEE | employee@demo.com | employee123 |

## RBAC
- `middleware.ts` blocks `/users/new`, `/bank`, `/audit` for non-ADMIN.
- All Server Actions re-check the session via `requireSession` / `requireRole`.
- Role-aware sidebar hides admin-only links from employees.

## Auto-Calc Engine (server-side only — `lib/calculations.ts`)
```ts
charges            = (swipeAmount * swipePercentage) / 100
clearedAmount      = min(paidAmount, dueAmount)
pendingAmount      = dueAmount - clearedAmount
extraSwipedAmount  = max(swipeAmount - dueAmount, 0)
balanceToCustomer  = clearedAmount - (swipeAmount - charges)
```
- All values are recomputed in `createTransaction` server action — never trusted from the client.
- Status `CLEARED` is rejected unless `paidAmount + swipeAmount >= dueAmount`.
- Persisted inside a single `prisma.$transaction(...)` for atomicity.

## How to test
1. **Login as ADMIN** → create an Employee in `/users/new`, add a bank in `/bank`.
2. **Login as Employee** → create a profile, then a ledger entry with e.g. due=10000, paid=6000, swipe=10000, %=2. Preview should show charges=200, cleared=6000, pending=4000, balanceToCustomer=-3800.
3. **Try setting Status=CLEARED** with paid+swipe<due → server rejects.
4. **Visit `/audit` as ADMIN** → see CREATE/UPDATE/DELETE events.

## Security & data handling
- PAN, card numbers, account numbers are **UI-masked** on display.
- Card numbers are stored masked (`**** **** **** 1234`) on transactions.
- Passwords are hashed with bcrypt cost 12.
- Zod validates inputs on both client and server.
- Server-side pagination (default 20/page) on all lists.
- Indexed: `(userId, status, date, cardNumber, profileId)`.

## Architecture
```
Client (RHF + Zod)
  ↓ Server Action
Zod re-validate → computeLedger() → prisma.$transaction
  → insert txn + audit log → revalidatePath
  ↓
Toast + UI refresh
```
