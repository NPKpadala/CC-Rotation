import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2, RotateCcw, AlertOctagon, ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrashRowActions } from "@/components/admin/TrashRowActions";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") notFound();

  const deleted = await prisma.transaction.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: 500,
    include: {
      deletedBy: { select: { name: true } },
      profile: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Trash2 className="h-6 w-6 text-red-600" /> Trash
        </h1>
        <p className="text-sm text-slate-500">
          Soft-deleted transactions. Restore to bring them back, or permanently delete (irreversible).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deleted Transactions ({deleted.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {deleted.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              ✨ Trash is empty.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Txn ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Deleted On</TableHead>
                  <TableHead>Deleted By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deleted.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap font-mono text-[10px] text-primary-700">
                      {t.transactionId ?? t.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{t.type.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{t.customerName}</div>
                      <div className="text-xs text-slate-500">{t.customerMobile}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(decimalToNumber(t.paidAmount))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {t.deletedAt ? formatDate(t.deletedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{t.deletedBy?.name ?? "—"}</TableCell>
                    <TableCell>
                      <TrashRowActions
                        id={t.id}
                        transactionId={t.transactionId ?? t.id.slice(0, 8)}
                        customerName={t.customerName}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
        <p className="flex items-start gap-2 text-xs text-amber-800">
          <AlertOctagon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            <strong>Permanent delete is irreversible.</strong> You'll be asked to type the transaction ID exactly to confirm. The original audit-log entry is preserved.
          </span>
        </p>
      </div>
    </div>
  );
}
