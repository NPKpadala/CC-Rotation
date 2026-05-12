"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateUserStatus, updateUserRole, resetUserPassword } from "@/actions/admin.actions";

export function UserRowActions({
  user,
  currentUserId,
}: {
  user: { id: string; name: string; role: string; status: string };
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isSelf = user.id === currentUserId;

  function changeRole(role: "ADMIN" | "EMPLOYEE" | "CUSTOMER") {
    if (isSelf) return;
    startTransition(async () => {
      const r = await updateUserRole(user.id, role);
      if (!r.success) toast.error(r.error ?? "Failed");
      else {
        toast.success("Role updated");
        router.refresh();
      }
    });
  }

  function changeStatus(status: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
    if (isSelf) return;
    startTransition(async () => {
      const r = await updateUserStatus(user.id, status);
      if (!r.success) toast.error(r.error ?? "Failed");
      else {
        toast.success("Status updated");
        router.refresh();
      }
    });
  }

  function resetPwd() {
    const pwd = prompt(`New password for ${user.name}? (min 6 chars)`);
    if (!pwd) return;
    startTransition(async () => {
      const r = await resetUserPassword(user.id, pwd);
      if (!r.success) toast.error(r.error ?? "Failed");
      else toast.success("Password reset");
    });
  }

  if (isSelf) return <span className="text-xs italic text-slate-400">(you)</span>;

  return (
    <div className="flex items-center gap-1.5">
      <Select
        defaultValue={user.role}
        onChange={(e) => changeRole(e.target.value as "ADMIN" | "EMPLOYEE" | "CUSTOMER")}
        disabled={isPending}
        className="h-8 w-[110px] text-xs"
      >
        <option value="ADMIN">Admin</option>
        <option value="EMPLOYEE">Employee</option>
        <option value="CUSTOMER">Customer</option>
      </Select>
      <Select
        defaultValue={user.status}
        onChange={(e) => changeStatus(e.target.value as "ACTIVE" | "INACTIVE" | "SUSPENDED")}
        disabled={isPending}
        className="h-8 w-[110px] text-xs"
      >
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
        <option value="SUSPENDED">Suspended</option>
      </Select>
      <Button variant="ghost" size="sm" onClick={resetPwd} disabled={isPending}>
        Reset PW
      </Button>
    </div>
  );
}
