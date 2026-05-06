import { prisma } from "@/lib/db";
import TransactionForm from "@/components/forms/TransactionForm";

export const dynamic = "force-dynamic";

export default async function NewTxnPage({ searchParams }: { searchParams: { profileId?: string } }) {
  const [profiles, banks] = await Promise.all([
    prisma.profile.findMany({ where: { isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
    prisma.bankAccount.findMany({ select: { id: true, name: true, isPrimary: true }, orderBy: { isPrimary: "desc" } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New Ledger Entry</h1>
      <TransactionForm profiles={profiles} banks={banks} defaultProfileId={searchParams.profileId} />
    </div>
  );
}
