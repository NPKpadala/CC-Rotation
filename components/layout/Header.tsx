"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  userName: string;
  userMobile: string;
  userRole: string;
}

export function Header({ userName, userMobile, userRole }: HeaderProps) {
  const router = useRouter();

  async function onLogout() {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3 lg:hidden">
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-slate-900">Sahsra</span>
      </div>

      <div className="hidden lg:block">
        <p className="text-sm text-slate-500">Welcome back</p>
        <p className="text-base font-semibold text-slate-900">{userName}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right md:block">
          <p className="text-sm font-medium text-slate-900">{userName}</p>
          <p className="text-xs text-slate-500">
            {userMobile} · <span className="font-semibold text-primary-600">{userRole}</span>
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          <UserIcon className="h-4 w-4" />
        </div>

        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
