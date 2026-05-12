import { Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DailyReportForm } from "@/components/forms/DailyReportForm";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DailyReportsPage() {
  const reports = await prisma.transaction.findMany({
    where: { type: "DAILY_REPORT" },
    orderBy: { transactionDate: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Wallet className="h-6 w-6 text-primary-600" /> Daily Wallet Reports
        </h1>
        <p className="text-sm text-slate-500">Opening / closing wallet snapshots with pendings</p>
      </div>

      <DailyReportForm />

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No reports yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                  <TableHead className="text-right">Pendings</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => {
                  const sumValues = (json: string | null) => {
                    if (!json) return 0;
                    try {
                      const obj = JSON.parse(json) as Record<string, unknown>;
                      let s = 0;
                      for (const v of Object.values(obj)) {
                        if (typeof v === "number") s += v;
                      }
                      return s;
                    } catch {
                      return 0;
                    }
                  };
                  const opening = sumValues(r.walletOpeningJson);
                  const closing = sumValues(r.walletClosingJson);
                  const diff = decimalToNumber(r.walletDifference);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{formatDate(r.transactionDate)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(opening)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(closing)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(decimalToNumber(r.walletPendings))}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(decimalToNumber(r.walletTotal))}</TableCell>
                      <TableCell className={`text-right font-mono ${diff < 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(diff)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
