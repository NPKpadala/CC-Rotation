import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BillPaymentForm } from "@/components/forms/BillPaymentForm";
import { Card, CardContent } from "@/components/ui/card";
import { decimalToNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditTransactionPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userRole = session?.user?.role ?? "EMPLOYEE";

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!tx || tx.type !== "BILL_PAYMENT") notFound();

  // ADDED v1.2 — Edit lock: cleared transactions are read-only for non-admins
  const isLocked = tx.status === "CLEARED" && userRole !== "ADMIN";

  const [profiles, allCards] = await Promise.all([
    prisma.profile.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, mobile: true },
      take: 500,
    }),
    prisma.card.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        bankName: true,
        cardNumberLast4: true,
        cardNetwork: true,
        defaultPercentage: true,
        profileId: true,
      },
      take: 1000,
    }),
  ]);

  const cards = allCards.map((c) => ({ ...c, defaultPercentage: Number(c.defaultPercentage) }));

  // Pull WhatsApp template + company name from system settings
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["whatsapp_message_template", "company_name"] } },
  });
  const companyName = settings.find((s) => s.key === "company_name")?.value ?? "Sahsra CC Rotations";
  const whatsappTemplate = settings.find((s) => s.key === "whatsapp_message_template")?.value;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/transactions/payments" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ChevronLeft className="h-4 w-4" /> Back to payments
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {isLocked ? (
            <span className="inline-flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-600" /> View Transaction (Locked)
            </span>
          ) : (
            "Edit Transaction"
          )}
        </h1>
        <p className="text-sm text-slate-500">
          Customer: {tx.customerName} ({tx.customerMobile}) · Status:{" "}
          <span className={tx.status === "CLEARED" ? "font-semibold text-green-600" : "font-semibold text-orange-600"}>
            {tx.status}
          </span>
        </p>
      </div>

      {isLocked && (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-4 text-sm text-red-700">
            🔒 This transaction is fully cleared and locked for non-admins. To edit, contact your administrator.
          </CardContent>
        </Card>
      )}

      <BillPaymentForm
        profiles={profiles}
        cards={cards}
        isEdit={true}
        isLocked={isLocked}
        initial={{
          id: tx.id,
          profileId: tx.profileId,
          cardId: tx.cardId ?? undefined,
          transactionDate: tx.transactionDate.toISOString(),
          customerName: tx.customerName,
          customerMobile: tx.customerMobile,
          dueAmount: decimalToNumber(tx.dueAmount),
          paidAmountRaw: tx.paidAmountRaw ?? "",
          paymentGateway: tx.paymentGateway ?? "",
          swipeAmountRaw: tx.swipeAmountRaw ?? "",
          swipeGateway: tx.swipeGateway ?? "",
          percentage: decimalToNumber(tx.percentage),
          charges: decimalToNumber(tx.charges),
          clearedAmount: decimalToNumber(tx.clearedAmount),
          extraSwipedPercent: decimalToNumber(tx.extraSwipedPercent),
          siteCharges: decimalToNumber(tx.siteCharges),
          pendingHeldBy: tx.pendingHeldBy ?? "",
          chargesSentType: tx.chargesSentType ?? "",
          remarks: tx.remarks ?? "",
          cardNameUsed: tx.cardNameUsed ?? "",
          clearedPhonePe: decimalToNumber(tx.clearedPhonePe),
          clearedWallet: decimalToNumber(tx.clearedWallet),
          clearedCash: decimalToNumber(tx.clearedCash),
          status: tx.status,
        }}
        companyName={companyName}
        whatsappTemplate={whatsappTemplate}
      />
    </div>
  );
}
