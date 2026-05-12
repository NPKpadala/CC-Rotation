"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Receipt, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/profiles", label: "Profiles", icon: Users },
  { href: "/transactions/payments", label: "Payments", icon: Receipt },
  { href: "/reports/pending", label: "Pending", icon: FileSpreadsheet },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs",
              active ? "text-primary-600" : "text-slate-500"
            )}
          >
            <Icon className={cn("h-5 w-5", active && "text-primary-600")} />
            <span className="font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
