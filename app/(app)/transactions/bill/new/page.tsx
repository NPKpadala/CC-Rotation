import Link from "next/link";
import { ChevronLeft, Receipt } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BillPaymentForm } from "@/components/forms/BillPaymentForm";

export const dynamic = "force-dynamic";

export default async function NewBillPaymentPage({
  searchParams,
}: {
  searchParams: { profileId?: string };
}) {
  const [profiles, cards, settings] = await Promise.all([
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
    prisma.systemSetting.findMany({
      where: { key: { in: ["whatsapp_message_template", "company_name"] } },
    }),
  ]);

  const cardsForForm = cards.map((c) => ({ ...c, defaultPercentage: Number(c.defaultPercentage) }));
  const companyName = settings.find((s) => s.key === "company_name")?.value ?? "Sahsra CC Rotations";
  const whatsappTemplate = settings.find((s) => s.key === "whatsapp_message_template")?.value;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/transactions/new"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back to chooser
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Receipt className="h-6 w-6 text-primary-600" /> New Bill Payment
        </h1>
        <p className="text-sm text-slate-500">
          Customer wants to pay their credit card bill. Tip: press <kbd className="rounded border border-slate-200 bg-slate-50 px-1">Ctrl+Enter</kbd> to save.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <BillPaymentForm
            profiles={profiles}
            cards={cardsForForm}
            defaultProfileId={searchParams.profileId}
            companyName={companyName}
            whatsappTemplate={whatsappTemplate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
