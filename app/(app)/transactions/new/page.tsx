import Link from "next/link";
import { Receipt, CreditCard, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function TransactionChooserPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Show recent counts for "today" so users see their throughput
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [billCount, swipeCount] = userId
    ? await Promise.all([
        prisma.transaction.count({
          where: {
            type: "BILL_PAYMENT",
            createdById: userId,
            deletedAt: null,
            createdAt: { gte: startOfToday },
          },
        }),
        prisma.transaction.count({
          where: {
            type: "CARD_SWIPE",
            createdById: userId,
            deletedAt: null,
            createdAt: { gte: startOfToday },
          },
        }),
      ])
    : [0, 0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Transaction</h1>
        <p className="text-sm text-slate-500">Pick the type of entry to record</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link href="/transactions/bill/new" className="group block">
          <Card className="h-full border-2 border-primary-200 transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Receipt className="h-8 w-8 text-primary-600" />
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">💳 Bill Payment</h2>
              <p className="mt-1 text-sm text-slate-600">
                Customer wants to pay their credit card bill via a payment gateway.
              </p>
              <p className="mt-4 inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                {billCount} created by you today
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions/swipe/new" className="group block">
          <Card className="h-full border-2 border-purple-200 transition-all hover:-translate-y-0.5 hover:border-purple-400 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <CreditCard className="h-8 w-8 text-purple-600" />
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">💵 ARD Swipe</h2>
              <p className="mt-1 text-sm text-slate-600">
                Customer brings their card for cash via swipe through a gateway.
              </p>
              <p className="mt-4 inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                {swipeCount} created by you today
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <p className="text-xs text-slate-400">
        Tip: press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5">Ctrl+N</kbd> from
        anywhere to land here. <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5">Ctrl+K</kbd>{" "}
        opens the search palette.
      </p>
    </div>
  );
}
