import { prisma } from "@/lib/db";
import StatsCards from "@/components/dashboard/StatsCards";
import MonthlyChart from "@/components/dashboard/MonthlyChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { format, subMonths, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [agg, activeUsers, recent] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { balanceToCustomer: true, pendingAmount: true, charges: true } }),
    prisma.profile.count({ where: { isActive: true } }),
    prisma.transaction.findMany({ orderBy: { date: "desc" }, take: 8, include: { profile: { select: { fullName: true } } } }),
  ]);
  const since = startOfMonth(subMonths(new Date(), 5));
  const monthly = await prisma.transaction.findMany({ where: { date: { gte: since } }, select: { date: true, charges: true, clearedAmount: true } });
  const buckets: Record<string, { month: string; charges: number; cleared: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const k = format(d, "yyyy-MM");
    buckets[k] = { month: format(d, "MMM"), charges: 0, cleared: 0 };
  }
  for (const t of monthly) {
    const k = format(t.date, "yyyy-MM");
    if (buckets[k]) { buckets[k].charges += t.charges; buckets[k].cleared += t.clearedAmount; }
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <StatsCards stats={{ totalBalance: agg._sum.balanceToCustomer || 0, totalPending: agg._sum.pendingAmount || 0, chargesCollected: agg._sum.charges || 0, activeUsers }} />
      <div className="grid gap-4 lg:grid-cols-2">
        <MonthlyChart data={Object.values(buckets)} />
        <Card>
          <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Date</TH><TH>Profile</TH><TH>Card</TH><TH>Amount</TH><TH>Status</TH></TR></THead>
              <TBody>
                {recent.map((t) => (
                  <TR key={t.id}>
                    <TD>{format(t.date, "dd MMM")}</TD>
                    <TD>{t.profile.fullName}</TD>
                    <TD className="font-mono text-xs">{t.cardNumber}</TD>
                    <TD>{formatINR(t.swipeAmount)}</TD>
                    <TD><Badge variant={t.status === "CLEARED" ? "success" : t.status === "PENDING" ? "warning" : "secondary"}>{t.status}</Badge></TD>
                  </TR>
                ))}
                {recent.length === 0 && <TR><TD colSpan={5} className="text-center text-muted-foreground">No transactions yet</TD></TR>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
