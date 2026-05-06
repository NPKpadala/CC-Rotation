import { requireSession } from "@/lib/rbac";
import { redirect } from "next/navigation";
import NewUserClient from "./NewUserClient";

export default async function NewUserPage() {
  const s = await requireSession();
  if (s.user.role !== "ADMIN") redirect("/dashboard");
  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">Create User</h1>
      <NewUserClient />
    </div>
  );
}
