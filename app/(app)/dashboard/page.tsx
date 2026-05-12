import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, decimalToNumber, maskMobile } from "@/lib/utils";
import {
  Users,
  CreditCard,
  Receipt,
  Wallet,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [
    totalProfiles,
    totalCards,
    totalTransactions,
    paidAgg,
    chargesAgg,
    pendingAgg,
    monthlyAgg,
    fraudCount,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.card.count({ where: { status: "ACTIVE" } }),
    prisma.transaction.count({ where: { type: "BILL_PAYMENT" } }),
    prisma.transaction.aggregate({
      where: { type: "BILL_PAYMENT" },
      _sum: { paidAmount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "BILL_PAYMENT" },
      _sum: { charges: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "BILL_PAYMENT", status: "PENDING" },
      _sum: { afterClearPending: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: "BILL_PAYMENT",
        transactionDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { charges: true },
    }),
    prisma.fraudCustomer.count(),
  ]);

  return {
    totalProfiles,
    totalCards,
    totalTransactions,
    totalPaid: decimalToNumber(paidAgg._sum.paidAmount),
    totalCharges: decimalToNumber(chargesAgg._sum.charges),
    totalPending: decimalToNumber(pendingAgg._sum.afterClearPending),
    monthlyCharges: decimalToNumber(monthlyAgg._sum.charges),
    fraudCount,
  };
}

async function getRecentTransactions() {
  return prisma.transaction.findMany({
    where: { type: "BILL_PAYMENT" },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      card: { select: { bankName: true, cardNumberLast4: true, cardNetwork: true } },
    },
  });
}

async function getTopGateways() {
  const grouped = await prisma.transaction.groupBy({
    by: ["paymentGateway"],
    where: { type: "BILL_PAYMENT", paymentGateway: { not: null } },
    _sum: { paidAmount: true },
    orderBy: { _sum: { paidAmount: "desc" } },
    take: 5,
  });
  return grouped.map((g) => ({
    gateway: g.paymentGateway ?? "—",
    amount: decimalToNumber(g._sum.paidAmount),
  }));
}

export default async function DashboardPage() {
  const stats = await getStats();
  const recent = await getRecentTransactions();
  const gateways = await getTopGateways();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of your operations as of {formatDate(new Date())}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          title="Total Profiles"
          value={stats.totalProfiles.toLocaleString("en-IN")}
          icon={Users}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          title="Active Cards"
          value={stats.totalCards.toLocaleString("en-IN")}
          icon={CreditCard}
          color="bg-purple-50 text-purple-700"
        />
        <StatCard
          title="Bill Payments"
          value={stats.totalTransactions.toLocaleString("en-IN")}
          icon={Receipt}
          color="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(stats.totalPaid)}
          icon={Wallet}
          color="bg-cyan-50 text-cyan-700"
        />
        <StatCard
          title="Total Charges"
          value={formatCurrency(stats.totalCharges)}
          icon={TrendingUp}
          color="bg-primary-50 text-primary-700"
        />
        <StatCard
          title="This Month Profit"
          value={formatCurrency(stats.monthlyCharges)}
          icon={TrendingUp}
          color="bg-green-50 text-green-700"
        />
        <StatCard
          title="Total Pending"
          value={formatCurrency(stats.totalPending)}
          icon={AlertCircle}
          color="bg-orange-50 text-orange-700"
        />
        <StatCard
          title="Fraud Cases"
          value={stats.fraudCount.toLocaleString("en-IN")}
          icon={AlertCircle}
          color="bg-red-50 text-red-700"
        />
      </div>

      {/* Top gateways + Recent transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Top Payment Gateways</CardTitle>
          </CardHeader>
          <CardContent>
            {gateways.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              <ul className="space-y-3">
                {gateways.map((g, i) => {
                  const max = gateways[0].amount || 1;
                  const pct = (g.amount / max) * 100;
                  return (
                    <li key={g.gateway} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          #{i + 1} {g.gateway}
                        </span>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatCurrency(g.amount)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-primary-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Bill Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No transactions yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(t.transactionDate)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{t.customerName}</div>
                        <div className="text-xs text-slate-500">{maskMobile(t.customerMobile)}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.card ? (
                          <span className="font-mono">
                            {t.card.bankName} ••{t.card.cardNumberLast4}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono">
                        {formatCurrency(decimalToNumber(t.paidAmount))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono">
                        {formatCurrency(decimalToNumber(t.afterClearPending))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.status === "CLEARED" ? "success" : "warning"}>
                          {t.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
              {title}
            </p>
            <p className="mt-2 truncate text-xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
