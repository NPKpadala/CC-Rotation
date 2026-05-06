import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";
import { Wallet, AlertCircle, Coins, Users } from "lucide-react";

export default function StatsCards({ stats }: {
  stats: { totalBalance: number; totalPending: number; chargesCollected: number; activeUsers: number };
}) {
  const items = [
    { label: "Total Balance to Customer", value: formatINR(stats.totalBalance), icon: Wallet, color: "text-emerald-600" },
    { label: "Total Pending", value: formatINR(stats.totalPending), icon: AlertCircle, color: "text-amber-600" },
    { label: "Charges Collected", value: formatINR(stats.chargesCollected), icon: Coins, color: "text-violet-600" },
    { label: "Active Profiles", value: String(stats.activeUsers), icon: Users, color: "text-blue-600" },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Card key={it.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">{it.label}</CardTitle>
              <Icon className={`h-5 w-5 ${it.color}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{it.value}</div></CardContent>
          </Card>
        );
      })}
    </div>
  );
}
