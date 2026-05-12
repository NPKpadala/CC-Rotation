"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Wallet,
  ShieldAlert,
  ShieldCheck,
  FileSpreadsheet,
  Cog,
  ScrollText,
  UserCog,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV: Array<{ section: string; items: NavItem[] }> = [
  {
    section: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/profiles", label: "Profiles", icon: Users },
    ],
  },
  {
    section: "Transactions",
    items: [
      { href: "/transactions/payments", label: "Bill Payments", icon: Receipt },
      { href: "/transactions/swiping", label: "Card Swiping", icon: CreditCard },
      { href: "/transactions/swiping?view=sheet", label: "Swipe Sheet", icon: FileSpreadsheet },
      { href: "/transactions/daily-reports", label: "Daily Reports", icon: Wallet },
    ],
  },
  {
    section: "Customers",
    items: [
      { href: "/customers/conduct", label: "Conduct Tracker", icon: ShieldCheck },
      { href: "/customers/fraud", label: "Fraud Management", icon: ShieldAlert },
    ],
  },
  {
    section: "Reports",
    items: [
      { href: "/reports/pending", label: "Pending Balances", icon: FileSpreadsheet },
      { href: "/reports/export", label: "Export Center", icon: FileSpreadsheet },
    ],
  },
  {
    section: "Admin",
    items: [
      { href: "/admin/users", label: "Users", icon: UserCog, adminOnly: true },
      { href: "/admin/audit", label: "Audit Logs", icon: ScrollText, adminOnly: true },
      { href: "/admin/trash", label: "Trash", icon: Trash2, adminOnly: true }, // v1.4 D1
      { href: "/admin/settings", label: "Settings", icon: Cog, adminOnly: true },
    ],
  },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
          <CreditCard className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Sahsra</p>
          <p className="text-xs text-slate-500">v1.4.0</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {NAV.map((sec) => {
          const visible = sec.items.filter((it) => !it.adminOnly || role === "ADMIN");
          if (visible.length === 0) return null;
          return (
            <div key={sec.section} className="mb-6">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {sec.section}
              </p>
              <ul className="space-y-0.5">
                {visible.map((it) => {
                  const Icon = it.icon;
                  const active = pathname === it.href || pathname.startsWith(it.href + "/");
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                          active
                            ? "bg-primary-50 text-primary-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", active && "text-primary-600")} />
                        <span>{it.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3 text-[10px] text-slate-400">
        © 2026 Sahsra CC Rotations
      </div>
    </aside>
  );
}
