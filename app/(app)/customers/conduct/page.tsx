import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConductBadge } from "@/components/shared/ConductBadge";
import { formatCurrency, decimalToNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ConductPage() {
  // Aggregate pending per profile
  const profiles = await prisma.profile.findMany({
    include: {
      transactions: {
        where: { type: "BILL_PAYMENT" },
        select: { afterClearPending: true, status: true, pendingHeldBy: true },
      },
    },
    orderBy: { name: "asc" },
  });

  type Row = { id: string; name: string; mobile: string; pending: number; conduct: "GOOD" | "PENDING"; heldBy: string | null };
  const rows: Row[] = profiles.map((p) => {
    const pending = p.transactions.reduce((s, t) => s + decimalToNumber(t.afterClearPending), 0);
    const lastHeld = p.transactions.find((t) => t.pendingHeldBy)?.pendingHeldBy ?? null;
    return {
      id: p.id,
      name: p.name,
      mobile: p.mobile,
      pending,
      conduct: pending > 0.01 ? "PENDING" : "GOOD",
      heldBy: lastHeld,
    };
  });

  const goodCount = rows.filter((r) => r.conduct === "GOOD").length;
  const pendingCount = rows.filter((r) => r.conduct === "PENDING").length;
  const totalPending = rows.reduce((s, r) => s + r.pending, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <ShieldCheck className="h-6 w-6 text-primary-600" /> Conduct Tracker
        </h1>
        <p className="text-sm text-slate-500">Auto-classified by pending balance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Good Standing</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{goodCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">With Pending</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Total Pending</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Pending Amount</TableHead>
                <TableHead>Held By</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.mobile}</div>
                  </TableCell>
                  <TableCell>
                    <ConductBadge totalPending={r.pending} heldBy={r.heldBy} />
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(r.pending)}</TableCell>
                  <TableCell className="text-sm">{r.heldBy ?? "—"}</TableCell>
                  <TableCell>
                    <Link href={`/profiles/${r.id}`} className="text-sm text-primary-600 hover:text-primary-700">
                      View →
                    </Link>
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
