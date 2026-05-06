import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/rbac";
import { redirect } from "next/navigation";
import BankClient from "./BankClient";

export const dynamic = "force-dynamic";

export default async function BankPage() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const banks = await prisma.bankAccount.findMany({ orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }] });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bank Accounts</h1>
      <BankClient banks={banks.map((b) => ({ id: b.id, name: b.name, accountNumber: b.accountNumber, ifsc: b.ifsc, isPrimary: b.isPrimary }))} />
    </div>
  );
}
