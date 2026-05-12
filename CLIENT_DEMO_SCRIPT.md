# Client Demo Script — Sahsra CC Rotations

**Suggested duration: 15–20 minutes.**

The goal of this script is to walk through the system in the order a real user would experience it, hitting every major feature once, in a flow that tells a story. Have a backup window with the audit log open if you can — clients love seeing every action they take show up there.

---

## Before the call

1. Run a fresh seed: `npm run db:seed`. This gives you predictable data.
2. Clear the browser session (or use incognito).
3. Have these tabs ready:
   - <http://localhost:3000> — the app
   - The audit log: <http://localhost:3000/admin/audit> (open in a 2nd window after login)
4. Have one document file (any PDF or JPG) handy for the upload demo.

---

## Part 1 — Login & Dashboard (2 min)

> "Let me show you how the team starts their day."

1. Go to <http://localhost:3000>. You'll be redirected to login.
2. Login as **admin**: `9999999999` / `admin@123`.
3. Land on the Dashboard.

**Talking points** while pointing at each tile:

- *Total transactions today, total profit today, pending balance, total customers* — at-a-glance health metrics.
- *Top gateways* bar chart — shows where money is flowing.
- *Recent transactions* table — latest five payments, color-coded by status.

> "Everything you do here will live in an audit trail — the person sitting next to me will pull that up at the end so you can see exactly what gets recorded."

---

## Part 2 — Create a Profile + Add a Card (3 min)

> "Now let's add a new customer end-to-end."

1. Click **Profiles → New Profile** (or via sidebar).
2. Fill in:
   - Name: `Demo Customer`
   - Mobile: `9123456789`
   - Email: `demo@example.com`
3. Click **Create Profile**. You're taken to the profile detail page.
4. Scroll to **Add New Card** form. Fill:
   - Holder Name: `Demo Customer`
   - Holder Mobile: `9123456789`
   - Bank: `HDFC`
   - Network: `HDFC RuPay (3.5%)`
   - Card Number: `4532123456781234` (any 16-digit test number)
   - Expiry: pick any future date
   - CVV: `123` (optional, hashed if entered)
5. Click **Add Card**.

**Talking points:**
- The system **never stores the full card number** — only the last 4 digits and a bcrypt hash. Show the masked card in the table after save.
- The default percentage **auto-fills** based on the card network — they can override per transaction if a special rate applies.

---

## Part 3 — Record a Bill Payment with Live Calculation (4 min)

> "Now the most important workflow — recording a bill payment with the live calculator."

1. Go to **Transactions → Bill Payments**.
2. In the form, select:
   - Profile: `Demo Customer`
   - Card: the HDFC RuPay card you just created
   - Customer Name and Mobile auto-fill
3. Enter:
   - Paid Amount: `50000+50000` ← **explain the split syntax** (the `+` lets the team record split payments cleanly)
   - Payment Gateway: `PAY1`
   - Percentage: leaves auto-filled at `3.5`
4. Click **Preview Calculations**. The right-hand panel updates with:
   - Paid Amount: ₹100,000
   - Charges (3.5%): ₹3,500
   - Pending Amount, Total Pending, etc.

**Critical talking points:**
- The calculation **runs on the server, not the browser** — this means even if a power user opens dev tools, they can't fudge the numbers. Every value you see is what's about to be saved.
- This is the team's biggest source of mistakes today (manual math). Now it's automatic.

5. Add `Pending Held By: Rajesh` and save.
6. The list below now shows the new entry. Show the `Pending` badge.

---

## Part 4 — Pending Reports & Export (3 min)

> "Now the report you'll run every Monday morning."

1. Click **Reports → Pending Balances**.
2. Show the totals at the top, then the **Held By Breakdown** — pending amounts grouped by employee.
3. Click **Excel** download button.

**Open the Excel file** and walk through:
- Sheet 1: Summary (totals, generated date)
- Sheet 2: Pending Customers (one row per pending transaction)
- Sheet 3: Payment-wise breakdown (grouped by gateway)

4. Back in the app, click **PDF** download.

**Open the PDF** and show:
- Branded header in primary red
- Print-ready landscape table
- Footer disclaimer on every page

> "These are auto-generated; no one has to copy-paste from Excel anymore."

---

## Part 5 — Conduct & Fraud Workflow (3 min)

> "Now the customer-management side — who do you trust, and who you don't."

1. Go to **Customers → Conduct**.
2. Show the auto-classification:
   - **Green** — customers with 0 pending
   - **Orange** — customers with pending balances
3. Filter / sort by amount to show your largest exposures.

Then:

4. Go to **Customers → Fraud**.
5. Add a fraud entry:
   - Mobile: `9876543210`
   - Name: `Fraud Test`
   - Card Details: `HDFC ****9999`
   - Remarks: `Charged back ₹50,000 — verified scam`
6. Save. The entry appears in the table with **Editable** badge.
7. Click **View →** on the entry.
8. Click **Submit & Lock**.

**Critical talking points:**
- Once submitted, the entry is **locked** for everyone except admins. This prevents employees from "cleaning up" fraud history.
- Show the lock badge.
- Now log out (top-right) and login as an **employee** (`9000000001 / emp@123`). Navigate to the same fraud entry — show that all fields are disabled.

---

## Part 6 — Admin: Users, Audit, Settings (3 min)

> "Finally, the admin tools — only admins see these."

Login back as admin.

1. Go to **Admin → Users**.
2. Show the user list. Demo:
   - Change an employee's status to `SUSPENDED` and back to `ACTIVE` (don't pick yourself — system blocks self-modification).
   - Click **Reset PW** on an employee — set a new password.
3. Go to **Admin → Audit Logs**.
4. Filter by **Action: SUBMIT** — show your fraud submission from a moment ago.
5. Filter by **Entity: Transaction** — show the bill payment.
6. Show that every login also appears in the log.

> "Every action your team takes is here — no hidden edits, no plausible deniability, no 'I don't know what happened to that record'."

7. Go to **Admin → Settings**.
8. Show the system settings — default percentages, max upload size, etc. Change one value, save it, and show that the change is also in the audit log.

---

## Part 7 — Wrap-up (2 min)

Talking points for the close:

- **Everything we just demoed is enforced server-side.** No matter what a user does in their browser, the rules hold.
- **Audit log is read-only** in the UI — admins can browse but never edit. (Mention if they want a separate "compliance officer" role with audit-only access, that's a 1-day add-on.)
- **Daily backups** are easy to set up — show them the `pg_dump` line in the README.
- **Mobile-friendly** — open on your phone (or resize the browser window) and show the bottom nav bar.

Ask:
1. "What's the one workflow your team does today that we haven't covered?"
2. "How many people will use this on day one?"
3. "Where do you want to host it — your laptop, an office server, a cloud VPS?"

---

## Backup answers for likely questions

**Q: What if my employee's laptop gets stolen?**
A: They can't access anything without the mobile + password. You can suspend their account in Admin → Users in 5 seconds. Their JWT will be invalid on next request.

**Q: Can two people record the same payment?**
A: Yes — there's no de-duplication on intent (the system can't read minds). But every action has the user, timestamp, and IP in the audit log, so duplicates are easy to find and one can be deleted (admin only).

**Q: What if PostgreSQL crashes mid-transaction?**
A: Every server action wraps writes in `prisma.$transaction()`. PostgreSQL guarantees atomicity — either the full transaction + audit log commit, or neither does.

**Q: What about ₹1 crore + transactions — does the math precision hold?**
A: Yes. We use PostgreSQL `Decimal(18,2)` end-to-end. JavaScript floats never touch the data. Show them `lib/calculations.ts` if they're technical.

**Q: How fast is it on a small server?**
A: Tested with the seed data (60 customers, 200+ transactions): every page loads under 200ms. The bottleneck is the database; for a single office, a $10/month VPS handles 10,000+ transactions easily.

**Q: Can we customize the columns / branding / company logo?**
A: Yes — the primary color is one CSS variable; the company name appears in 3 places (PDF header, login, sidebar). Easy 30-min change.

---

## Cleanup after demo

```powershell
npm run db:seed   # restores predictable demo state
```

Or just truncate transactions if you want to keep the customer list:

```sql
TRUNCATE transactions, audit_logs, conduct_records RESTART IDENTITY CASCADE;
```
