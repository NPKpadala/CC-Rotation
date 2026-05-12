#!/usr/bin/env bash
set -e

# ============================================================
#  CC Rotation Ledger - Linux setup script
# ============================================================

echo
echo " CC Rotation Ledger - first-time setup"
echo " ======================================"
echo

if [ ! -f .env.local ]; then
  echo "[1/5] No .env.local found - copying from .env.example..."
  cp .env.example .env.local
  echo
  echo " IMPORTANT: Edit .env.local now and set your DATABASE_URL,"
  echo "            then re-run this script."
  exit 1
fi

echo "[1/5] Installing npm dependencies..."
npm install

echo
echo "[2/5] Generating Prisma client..."
npx prisma generate

echo
echo "[3/5] Pushing schema to database..."
if ! npx prisma db push; then
  echo
  echo " Could not connect to database."
  echo " Make sure PostgreSQL is running and DATABASE_URL in .env.local is correct."
  exit 1
fi

echo
echo "[4/5] Seeding demo data..."
npm run db:seed

echo
echo "[5/5] Setup complete!"
echo
echo " Demo logins:"
echo "   Admin:     9999999999 / admin@123"
echo "   Employee:  9000000001 / emp@123"
echo
echo " Now run:    npm run dev"
echo " Or build:   npm run build && npm start"
echo
