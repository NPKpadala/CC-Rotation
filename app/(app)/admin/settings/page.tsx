import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Cog } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const settings = await prisma.systemSetting.findMany({
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  const grouped: Record<string, typeof settings> = {};
  for (const s of settings) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Cog className="h-6 w-6 text-primary-600" /> System Settings
        </h1>
        <p className="text-sm text-slate-500">Default rates, gateways, and global config</p>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="capitalize">{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {items.map((s) => (
                <SettingsForm key={s.id} settingKey={s.key} label={s.label} value={s.value} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
