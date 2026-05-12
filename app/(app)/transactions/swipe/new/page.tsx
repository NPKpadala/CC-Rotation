import Link from "next/link";
import { ChevronLeft, CreditCard } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ArdSwipeForm } from "@/components/forms/ArdSwipeForm";

export const dynamic = "force-dynamic";

export default async function NewArdSwipePage({
  searchParams,
}: {
  searchParams: { profileId?: string };
}) {
  const [profiles, cards] = await Promise.all([
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
        cardNumberFull: true,
        cardNetwork: true,
        defaultPercentage: true,
        profileId: true,
        swipeAttemptCount: true,
      },
      take: 1000,
    }),
  ]);

  const cardsForForm = cards.map((c) => ({
    id: c.id,
    bankName: c.bankName,
    cardNumberLast4: c.cardNumberLast4,
    cardNumberFull: c.cardNumberFull,
    cardNetwork: c.cardNetwork,
    defaultPercentage: Number(c.defaultPercentage),
    profileId: c.profileId,
    swipeAttemptCount: c.swipeAttemptCount,
  }));

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
          <CreditCard className="h-6 w-6 text-purple-600" /> New ARD Swipe
        </h1>
        <p className="text-sm text-slate-500">
          Customer brings card for cash via swipe. Live calculation on the right.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ArdSwipeForm
            profiles={profiles}
            cards={cardsForForm}
            defaultProfileId={searchParams.profileId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
