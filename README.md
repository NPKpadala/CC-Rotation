# Sahsra CC Rotations

A complete credit-card rotation and bill payment ledger system for finance teams. Manage every swipe, every payment, every rupee — in one command center.

Built with Next.js 14 (App Router), TypeScript, Prisma, PostgreSQL, NextAuth v5, and Tailwind CSS.

---

## Features

- **Profile management** – Add customers, attach multiple cards each (HDFC, ICICI, Axis, SBI, Kotak, Yes Bank, IDFC, IndusInd, RBL)
- **Bill payments** – Record split payments (`50000+50000`), auto-calculate charges, pending balance, profit
- **Card swiping** – Direct swipes with network-aware percentages (Visa 2.5%, RuPay 3%, AmEx 4%, etc.)
- **Daily wallet reports** – Track opening/closing balances across PhonePe, Pay1, PayBijili, PayMama, SoftPay, Roinet
- **Conduct tracking** – Auto-classify customers as Green (good standing) or Orange (pending) by balance
- **Fraud management** – Report fraud customers; submit-and-lock workflow (only admins can edit after submission)
- **Pending balance reports** – Live aggregated view + per-employee breakdown
- **Excel & PDF export** – 3-sheet workbook (Summary, Pending Customers, Payment-wise) and printable PDF
- **RBAC** – Three roles (Admin, Employee, Customer) with route-level enforcement
- **Audit trail** – Every mutation logged in a tamper-evident table; admin can browse and filter
- **Floating calculator** – Always-available numeric pad
- **Mobile-friendly** – Responsive layout with bottom nav for phones

---

## Quick start (Windows)

### Prerequisites

1. **Node.js 18.18+** – Download from <https://nodejs.org/>. Choose LTS.
2. **PostgreSQL 14+** – Download from <https://www.postgresql.org/download/windows/>. During setup, remember the postgres user password — you'll need it.
3. **Git** (optional but useful) – <https://git-scm.com/download/win>.

### 1) Clone or unzip the project

If you got this as a zip, unzip it. Then open **PowerShell** in the project folder.

### 2) Install dependencies

```powershell
npm install
```

This will install ~566 packages and takes about a minute.

### 3) Create the database

Open `pgAdmin 4` (installed with PostgreSQL) or use the `psql` shell:

```sql
CREATE DATABASE cc_rotation_ledger;
```

### 4) Configure environment

Copy `.env.example` to `.env.local`:

```powershell
copy .env.example .env.local
```

Then edit `.env.local` and set the database URL — replace `YOUR_PASSWORD` with the password you set during PostgreSQL install:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/cc_rotation_ledger?schema=public"
AUTH_SECRET="any-long-random-string-here-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

You can generate a random `AUTH_SECRET` with:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5) Generate Prisma client + run migrations

```powershell
npx prisma generate
npx prisma db push
```

> `db push` syncs your schema directly to the database — perfect for first-time setup or development. For production, use `prisma migrate` instead.

### 6) Seed demo data

```powershell
npm run db:seed
```

This creates: **1 admin**, **3 employees**, **50 customer profiles**, **~120 cards**, **~120 bill payments**, **50 swipes**, **10 daily reports**, **25 conduct records**, **5 fraud entries**, **2 bank accounts**, and a system settings table.

### 7) Start the app

```powershell
npm run dev
```

Open <http://localhost:3000>.

### Demo credentials

| Role     | Mobile        | Password   |
| -------- | ------------- | ---------- |
| Admin    | `9999999999`  | `admin@123` |
| Employee | `9000000001`  | `emp@123`   |
| Employee | `9000000002`  | `emp@123`   |
| Employee | `9000000003`  | `emp@123`   |

---

## Linux server deployment

### Option A — PM2 (simplest)

```bash
# 1. Install Node 18+, PostgreSQL, build essentials
sudo apt update && sudo apt install -y nodejs npm postgresql postgresql-contrib build-essential

# 2. Create db & user
sudo -u postgres psql -c "CREATE DATABASE cc_rotation_ledger;"
sudo -u postgres psql -c "CREATE USER ledger_user WITH PASSWORD 'a-strong-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE cc_rotation_ledger TO ledger_user;"

# 3. Pull/upload your code, then in the project dir:
npm ci
npx prisma generate
npx prisma db push
npm run db:seed   # only for first install
npm run build

# 4. Set production env
cat > .env.local <<'EOF'
DATABASE_URL="postgresql://ledger_user:a-strong-password@localhost:5432/cc_rotation_ledger"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://your-domain.com"
NODE_ENV="production"
EOF

# 5. Run with PM2
sudo npm install -g pm2
pm2 start npm --name "cc-ledger" -- start
pm2 save
pm2 startup    # follow the printed command to install the systemd unit
```

### Option B — systemd

Create `/etc/systemd/system/cc-ledger.service`:

```ini
[Unit]
Description=Sahsra CC Rotations
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/sahsra-cc-rotations
EnvironmentFile=/opt/sahsra-cc-rotations/.env.local
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cc-ledger
sudo systemctl status cc-ledger
```

### Reverse proxy (nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 10M;  # for file uploads

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /opt/sahsra-cc-rotations/public/uploads/;
        expires 30d;
    }
}
```

Then add HTTPS via certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Project structure

```
sahsra-cc-rotations/
├── actions/                   # Server actions (server-only, with audit log)
├── app/
│   ├── (app)/                 # Authenticated routes
│   │   ├── dashboard/         # KPI dashboard
│   │   ├── profiles/          # Customer profiles + cards
│   │   ├── transactions/      # Payments, swiping, daily reports
│   │   ├── customers/         # Conduct + fraud tracking
│   │   ├── reports/           # Pending balances, exports
│   │   └── admin/             # Users, audit, settings (admin-only)
│   ├── (auth)/login/          # Login page
│   └── api/                   # Auth, upload, exports
├── components/
│   ├── forms/                 # All input forms
│   ├── layout/                # Sidebar, header, mobile nav
│   ├── ui/                    # shadcn-style primitives
│   └── shared/                # Calculator, file upload, conduct badge
├── lib/
│   ├── auth.ts                # NextAuth v5 config
│   ├── calculations.ts        # ⚠️ Server-only financial math
│   ├── db.ts                  # Prisma singleton
│   ├── rbac.ts                # Role guards
│   ├── exporters/             # Excel + PDF generators
│   └── validations/           # Zod schemas
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── public/uploads/            # Local file uploads (swap for S3/R2 in prod)
```

## Key conventions

- **All financial math runs on the server.** `lib/calculations.ts` imports `"server-only"` and is the single source of truth. Bill payment forms call a server action `previewBillPayment` for live preview — the client never computes charges.
- **Card numbers are never stored.** We keep the bcrypt hash + last 4 digits only. CVVs are also bcrypt-hashed if entered.
- **Every mutation is audit-logged.** Server actions wrap Prisma calls in `prisma.$transaction()` with an `auditLog.create`. Deletes are not silent.
- **RBAC is enforced server-side.** `requireRole(session, ...roles)` throws if access is denied. Middleware adds an extra layer for `/admin/*` routes.
- **Admins cannot lock themselves out.** Self-edit guards prevent demoting or suspending your own account.

## Daily operations

| Task                                | Command                          |
| ----------------------------------- | -------------------------------- |
| Run dev server                      | `npm run dev`                    |
| Build for production                | `npm run build`                  |
| Start production server             | `npm start`                      |
| Open Prisma Studio (db browser)     | `npx prisma studio`              |
| Re-seed database                    | `npm run db:seed`                |
| Run typecheck                       | `npm run typecheck`              |
| Sync schema to database             | `npx prisma db push`             |

## Backup

```bash
# Daily backup cron
pg_dump cc_rotation_ledger > /backups/ledger-$(date +%F).sql

# Restore
psql cc_rotation_ledger < /backups/ledger-2026-05-08.sql
```

## Troubleshooting

**"Cannot find module '@prisma/client'"** – run `npx prisma generate`.

**"Connection refused" / DB errors** – Make sure PostgreSQL is running:
- Windows: Services → PostgreSQL → Start
- Linux: `sudo systemctl start postgresql`

**Login loop / "session expired"** – Your `AUTH_SECRET` may have changed. Clear cookies for `localhost:3000` and try again.

**"Invalid percentage" or "split format wrong"** – Check the bill payment form. Paid amount must be digits separated by `+` (e.g. `50000+50000`), no spaces.

**Type errors in editor before first run** – Run `npx prisma generate` once. Most "implicit any" errors come from the Prisma client not being generated yet.

## Security checklist for production

- [ ] Replace `AUTH_SECRET` with a strong random value (use `openssl rand -base64 32`)
- [ ] Replace seeded admin password (`admin@123` → strong password) immediately
- [ ] Enable HTTPS via certbot or your provider's TLS
- [ ] Configure firewall: only allow ports 80, 443, 22 from outside
- [ ] Set up daily DB backups (cron + `pg_dump`)
- [ ] Switch file storage from `./public/uploads` to S3/R2 if you have many users (the local path doesn't scale beyond a single server)
- [ ] Set `NODE_ENV=production` in `.env.local`
- [ ] Review the audit log routinely (Admin → Audit Logs)

## Tech stack

- **Next.js 14** App Router with React Server Components
- **TypeScript** strict mode
- **Prisma 5** + **PostgreSQL**
- **NextAuth v5 (Auth.js)** with credentials provider
- **Tailwind CSS** with custom red theme (`#DC2626`)
- **shadcn-style UI** primitives (custom-built, no Radix dependency for Select)
- **Zod** for validation
- **bcryptjs** for password & card hashing
- **SheetJS (xlsx)** for Excel exports
- **jsPDF + jspdf-autotable** for PDF reports
- **sonner** for toast notifications
- **lucide-react** for icons

## License

Proprietary — internal use only.
