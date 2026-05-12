import Link from "next/link";
import { FileSpreadsheet, Download, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OldPendingsCell } from "@/components/reports/OldPendingsCell";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PendingReportPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  // Get pending bill payment transactions
  const txs = await prisma.transaction.findMany({
    where: { type: "BILL_PAYMENT", status: "PENDING" },
    orderBy: { afterClearPending: "desc" },
    take: 500,
    include: {
      card: { select: { bankName: true, cardNumberLast4: true, cardNetwork: true } },
      profile: { select: { id: true, name: true, mobile: true, oldPendings: true, clearedOldPendings: true } },
    },
  });

  const totalNewPending = txs.reduce((s, t) => s + decimalToNumber(t.afterClearPending), 0);
  const totalCharges = txs.reduce((s, t) => s + decimalToNumber(t.charges), 0);

  // ADDED v1.2 — Per-profile rollup including old pendings
  const profileMap = new Map<
    string,
    {
      profileId: string;
      profileName: string;
      profileMobile: string;
      newPendings: number;
      oldPendings: number;
      clearedOldPendings: number;
      transactions: typeof txs;
    }
  >();

  for (const t of txs) {
    if (!t.profile) continue;
    const k = t.profile.id;
    const cur = profileMap.get(k) ?? {
      profileId: t.profile.id,
      profileName: t.profile.name,
      profileMobile: t.profile.mobile,
      newPendings: 0,
      oldPendings: decimalToNumber(t.profile.oldPendings),
      clearedOldPendings: decimalToNumber(t.profile.clearedOldPendings),
      transactions: [],
    };
    cur.newPendings += decimalToNumber(t.afterClearPending);
    cur.transactions.push(t);
    profileMap.set(k, cur);
  }

  // Also include profiles that have ONLY old pendings (no current pending tx)
  const oldOnlyProfiles = await prisma.profile.findMany({
    where: {
      AND: [{ oldPendings: { gt: 0 } }, { id: { notIn: Array.from(profileMap.keys()) } }],
    },
    select: { id: true, name: true, mobile: true, oldPendings: true, clearedOldPendings: true },
  });

  for (const p of oldOnlyProfiles) {
    profileMap.set(p.id, {
      profileId: p.id,
      profileName: p.name,
      profileMobile: p.mobile,
      newPendings: 0,
      oldPendings: decimalToNumber(p.oldPendings),
      clearedOldPendings: decimalToNumber(p.clearedOldPendings),
      transactions: [],
    });
  }

  const profileRows = Array.from(profileMap.values()).sort((a, b) => {
    const at = a.newPendings + a.oldPendings - a.clearedOldPendings;
    const bt = b.newPendings + b.oldPendings - b.clearedOldPendings;
    return bt - at;
  });

  const totalOldPendings = profileRows.reduce((s, r) => s + r.oldPendings, 0);
  const totalClearedOld = profileRows.reduce((s, r) => s + r.clearedOldPendings, 0);
  const totalPendingAmount = totalNewPending + totalOldPendings - totalClearedOld;

  // ADDED v1.2 — User-wise (per-employee) pending breakdown
  const byHeldBy: Record<string, { count: number; amount: number }> = {};
  for (const t of txs) {
    const k = t.pendingHeldBy ?? "Unassigned";
    if (!byHeldBy[k]) byHeldBy[k] = { count: 0, amount: 0 };
    byHeldBy[k].count++;
    byHeldBy[k].amount += decimalToNumber(t.afterClearPending);
  }
  const byHeldByRows = Object.entries(byHeldBy).sort((a, b) => b[1].amount - a[1].amount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <FileSpreadsheet className="h-6 w-6 text-primary-600" /> Pending Balances
          </h1>
          <p className="text-sm text-slate-500">
            {profileRows.length} customers with pending · Sorted by total amount
            {!isAdmin && <span className="ml-2 text-xs italic">· admin only can edit old pendings</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href="/api/export/excel?type=pending" download>
              <Download className="h-4 w-4" /> Excel
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/export/pdf?type=pending" download>
              <Download className="h-4 w-4" /> PDF
            </a>
          </Button>
        </div>
      </div>

      {/* TOTALS BAR */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">New Pendings</p>
            <p className="mt-1 text-xl font-bold text-orange-600">{formatCurrency(totalNewPending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Old Pendings</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(totalOldPendings)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Cleared Old</p>
            <p className="mt-1 text-xl font-bold text-green-600">−{formatCurrency(totalClearedOld)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary-200 bg-primary-50/40">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-primary-700">TOTAL PENDING</p>
            <p className="mt-1 text-2xl font-bold text-primary-700">{formatCurrency(totalPendingAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* USER-WISE BREAKDOWN */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-600" /> Pending by Employee (Held By)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Pending Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byHeldByRows.map(([name, v]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.count}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-orange-600">{formatCurrency(v.amount)}</TableCell>
                </TableRow>
              ))}
              {byHeldByRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-slate-500">No pending balances right now</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PROFILE-WISE PENDINGS WITH EDITABLE OLD PENDINGS */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Pending Reports</CardTitle>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? "Click Old Pendings or Cleared Old to edit (admin only)."
              : "Visible to all users · Old pendings are read-only for non-admins."}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">New Pending</TableHead>
                <TableHead className="text-right">Old Pendings</TableHead>
                <TableHead className="text-right">Cleared Old</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profileRows.map((r) => {
                const total = r.newPendings + r.oldPendings - r.clearedOldPendings;
                return (
                  <TableRow key={r.profileId}>
                    <TableCell>
                      <Link href={`/profiles/${r.profileId}`} className="font-medium text-slate-900 hover:text-primary-600">
                        {r.profileName}
                      </Link>
                      <div className="text-xs text-slate-500">{r.profileMobile}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-orange-600">
                      {formatCurrency(r.newPendings)}
                    </TableCell>
                    <TableCell className="text-right">
                      <OldPendingsCell
                        profileId={r.profileId}
                        oldPendings={r.oldPendings}
                        clearedOldPendings={r.clearedOldPendings}
                        field="oldPendings"
                        canEdit={isAdmin}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <OldPendingsCell
                        profileId={r.profileId}
                        oldPendings={r.oldPendings}
                        clearedOldPendings={r.clearedOldPendings}
                        field="clearedOldPendings"
                        canEdit={isAdmin}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-bold text-primary-700">
                      {formatCurrency(total)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {profileRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-slate-500">No pending customers</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* INDIVIDUAL TRANSACTIONS */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Transactions ({txs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Card</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Charges</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead>Held By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txs.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs">{formatDate(t.transactionDate)}</TableCell>
                  <TableCell>
                    <Link href={`/profiles/${t.profileId}`} className="font-medium text-slate-900 hover:text-primary-600">
                      {t.customerName}
                    </Link>
                    <div className="text-xs text-slate-500">{t.customerMobile}</div>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {t.card ? `${t.card.bankName} ••${t.card.cardNumberLast4}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(decimalToNumber(t.paidAmount))}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-primary-600">{formatCurrency(decimalToNumber(t.charges))}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-orange-600 font-semibold">{formatCurrency(decimalToNumber(t.afterClearPending))}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{t.pendingHeldBy ?? "—"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
