@echo off
REM ============================================================
REM  CC Rotation Ledger - First-time setup script for Windows
REM ============================================================
echo.
echo  CC Rotation Ledger - first-time setup
echo  ======================================
echo.

if not exist .env.local (
    echo [1/5] No .env.local found - copying from .env.example...
    copy .env.example .env.local
    echo.
    echo  IMPORTANT: Edit .env.local now and set your DATABASE_URL password,
    echo             then re-run this script.
    pause
    exit /b 1
)

echo [1/5] Installing npm dependencies (this takes ~1-2 minutes)...
call npm install
if errorlevel 1 goto fail

echo.
echo [2/5] Generating Prisma client...
call npx prisma generate
if errorlevel 1 goto fail

echo.
echo [3/5] Pushing schema to database...
call npx prisma db push
if errorlevel 1 (
    echo.
    echo  Could not connect to database.
    echo  Make sure PostgreSQL is running and your DATABASE_URL in .env.local is correct.
    pause
    exit /b 1
)

echo.
echo [4/5] Seeding demo data...
call npm run db:seed
if errorlevel 1 goto fail

echo.
echo [5/5] Setup complete!
echo.
echo  Demo logins:
echo    Admin:     9999999999 / admin@123
echo    Employee:  9000000001 / emp@123
echo.
echo  Now run:    npm run dev
echo  Then open:  http://localhost:3000
echo.
pause
exit /b 0

:fail
echo.
echo  Setup failed. See errors above.
pause
exit /b 1
