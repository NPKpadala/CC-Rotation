"use client";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";

export default function Header({ user }: { user: { name?: string | null; email: string; role: "ADMIN" | "EMPLOYEE" } }) {
  return (
    <header className="h-14 px-4 md:px-6 border-b flex items-center justify-between bg-card">
      <div className="font-medium">Welcome, {user.name || user.email}</div>
      <div className="flex items-center gap-3">
        <Badge variant={user.role === "ADMIN" ? "admin" : "employee"}>{user.role}</Badge>
        <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </header>
  );
}
