"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Receipt, Landmark, ScrollText, UserPlus } from "lucide-react";

const baseNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Profiles", icon: Users },
  { href: "/transactions", label: "Transaction Log", icon: Receipt },
];
const adminNav = [
  { href: "/users/new", label: "New User", icon: UserPlus },
  { href: "/bank", label: "Bank Accounts", icon: Landmark },
  { href: "/audit", label: "Audit Logs", icon: ScrollText },
];

export default function Sidebar({ role }: { role: "ADMIN" | "EMPLOYEE" }) {
  const pathname = usePathname();
  const items = role === "ADMIN" ? [...baseNav, ...adminNav] : baseNav;
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card">
      <div className="h-14 px-4 flex items-center font-semibold border-b">CC Rotation</div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map((it) => {
          const Active = pathname === it.href || pathname.startsWith(it.href + "/");
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href}
              className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                Active && "bg-accent text-accent-foreground font-medium")}>
              <Icon className="h-4 w-4" />{it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 text-xs text-muted-foreground border-t">v1.0 · Ledger Only</div>
    </aside>
  );
}
