"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createUser } from "@/actions/admin.actions";

export function CreateUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createUser(fd);
      if (!r.success) {
        setError(r.error ?? "Failed");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("User created");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Add User
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Name</Label>
            <Input id="name" name="name" required minLength={2} placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mobile" className="text-xs">Mobile</Label>
            <Input id="mobile" name="mobile" required pattern="\d{10}" maxLength={10} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Password</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-xs">Role</Label>
            <Select id="role" name="role" required defaultValue="EMPLOYEE">
              <option value="ADMIN">Admin</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="CUSTOMER">Customer</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create"}
            </Button>
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-5">{error}</div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
