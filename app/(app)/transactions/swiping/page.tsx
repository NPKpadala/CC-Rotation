import Link from "next/link";
import { CreditCard, FileSpreadsheet, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArdSwipeForm } from "@/components/forms/ArdSwipeForm";
import { ArdSwipeFormDialog } from "@/components/forms/ArdSwipeFormDialog";
import { formatCurrency, formatDate, decimalToNumber, parseIntSafe, buildPagination, cn } from "@/lib/utils";
import { formatCardNumberDisplay } from "@/lib/calc-shared";
import { PAGE_SIZE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SwipingPage({
  searchParams,
}: {
  searchParams: { page?: string; profileId?: string; view?: string };
}) {
  const page = parseIntSafe(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    type: "CARD_SWIPE" as const, deletedAt: null, // v1.4 D1 soft-delete filter
    ...(searchParams.profileId ? { profileId: searchParams.profileId } : {}),
  };

  const [profiles, allCards, txs, total] = await Promise.all([
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
    prisma.transaction.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { transactionDate: "desc" },
      include: {
        card: { select: { bankName: true, cardNumberLast4: true, cardNumberFull: true, cardNetwork: true } },
        profile: { select: { name: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  const cardsForForm = allCards.map((c) => ({
    id: c.id,
    bankName: c.bankName,
    cardNumberLast4: c.cardNumberLast4,
    cardNumberFull: c.cardNumberFull,
    cardNetwork: c.cardNetwork,
    defaultPercentage: Number(c.defaultPercentage),
    profileId: c.profileId,
    swipeAttemptCount: c.swipeAttemptCount,
  }));

  const pagination = buildPagination(page, PAGE_SIZE, total);

  // Aggregate KPIs
  const totalSwiped = txs.reduce((s, t) => s + decimalToNumber(t.swipeAmount), 0);
  const totalCharges = txs.reduce((s, t) => s + decimalToNumber(t.charges), 0);
  const totalProfit = txs.reduce((s, t) => s + decimalToNumber(t.profit), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <CreditCard className="h-6 w-6 text-primary-600" /> Card Swiping
            <span className="text-base font-normal text-slate-500">— ARD Sheet</span>
          </h1>
          <p className="text-sm text-slate-500">
            {total.toLocaleString("en-IN")} swipes recorded · matches May Swiping Sheet 2026 format
          </p>
        </div>

        <ArdSwipeFormDialog
          profiles={profiles}
          cards={cardsForForm}
          defaultProfileId={searchParams.profileId}
        />
      </div>

      {/* KPI band */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Total Swiped</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(totalSwiped)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Charges</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-primary-600">{formatCurrency(totalCharges)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Profit</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(totalProfit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Count</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{total}</p>
          </CardContent>
        </Card>
      </div>

      {/* The 19-column ARD sheet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4 text-primary-600" /> Swipe Sheet
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {txs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No swipes recorded. Click "New ARD Swipe" to add the first one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-slate-50">
                  <tr className="text-left">
                    <Th>S.NO</Th>
                    <Th>TXN ID</Th>
                    <Th>DATE</Th>
                    <Th>NAME</Th>
                    <Th>MOBILE</Th>
                    <Th right>SWIPE AMT</Th>
                    <Th right>%</Th>
                    <Th right>CHARGES</Th>
                    <Th right>EXTRA ₹</Th>
                    <Th right>BALANCE</Th>
                    <Th right>SENT</Th>
                    <Th right>PENDING</Th>
                    <Th>CARD NAME</Th>
                    <Th>TYPE</Th>
                    <Th>CARD #</Th>
                    <Th>SWIPE SITE</Th>
                    <Th>SENT ACCT</Th>
                    <Th>REMARKS</Th>
                    <Th right>OUR CHG</Th>
                    <Th right>PROFIT</Th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t, idx) => {
                    // Resolve card display fields (SAME → from joined card; OTHER → from snapshot)
                    let cardName = "—";
                    let cardType = "—";
                    let cardDigits = "—";
                    if (t.ardSwipeSource === "OTHER" && t.ardCardSnapshot) {
                      const snap = t.ardCardSnapshot as { bank?: string; network?: string; cardNumberLast4?: string };
                      cardName = (snap.bank ?? "").replace(/_/g, " ");
                      cardType = (snap.network ?? "").replace(/_/g, " ");
                      cardDigits = `••••${snap.cardNumberLast4 ?? ""}`;
                    } else if (t.card) {
                      cardName = t.card.bankName.replace(/_/g, " ");
                      cardType = t.card.cardNetwork.replace(/_/g, " ");
                      cardDigits = t.card.cardNumberFull
                        ? formatCardNumberDisplay(t.card.cardNumberFull)
                        : `••••${t.card.cardNumberLast4}`;
                    }

                    const pending = decimalToNumber(t.pendingToCustomer);
                    const profit = decimalToNumber(t.profit);
                    const sno = skip + idx + 1;

                    return (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <Td>{sno}</Td>
                        <Td className="font-mono text-[10px] text-primary-700">
                          {t.transactionId ?? t.id.slice(0, 8)}
                        </Td>
                        <Td>{formatDate(t.transactionDate)}</Td>
                        <Td>
                          <Link href={`/profiles/${t.profileId}`} className="font-medium hover:text-primary-600">
                            {t.customerName}
                          </Link>
                        </Td>
                        <Td mono>{t.customerMobile}</Td>
                        <Td right mono>{formatCurrency(decimalToNumber(t.swipeAmount))}</Td>
                        <Td right mono>{Number(t.percentage).toFixed(2)}%</Td>
                        <Td right mono className="text-primary-600">{formatCurrency(decimalToNumber(t.charges))}</Td>
                        <Td right mono>{formatCurrency(decimalToNumber(t.ardExtraCharges))}</Td>
                        <Td right mono>{formatCurrency(decimalToNumber(t.ardBalanceAmount))}</Td>
                        <Td right mono>{formatCurrency(decimalToNumber(t.ardSentToCustomer))}</Td>
                        <Td
                          right
                          mono
                          className={cn(
                            Math.abs(pending) > 0.01 && "font-semibold",
                            pending < -0.01 ? "text-orange-600" : pending > 0.01 ? "text-orange-600" : "text-green-600"
                          )}
                          title={pending < -0.01 ? "We sent extra — customer owes us" : pending > 0.01 ? "Customer underpaid — we owe customer" : "Settled"}
                        >
                          {formatCurrency(pending)}
                        </Td>
                        <Td>{cardName}</Td>
                        <Td>{cardType}</Td>
                        <Td mono className="whitespace-nowrap">{cardDigits}</Td>
                        <Td>
                          <Badge variant="outline" className="text-[10px]">{t.swipeGateway ?? "—"}</Badge>
                        </Td>
                        <Td mono className="max-w-[160px] truncate">{t.ardSentAccount ?? "—"}</Td>
                        <Td className="max-w-[200px] truncate">{t.remarks ?? "—"}</Td>
                        <Td right mono>{formatCurrency(decimalToNumber(t.ardOurCharges))}</Td>
                        <Td
                          right
                          mono
                          className={cn(
                            "font-semibold",
                            profit >= 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {formatCurrency(profit)}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            {pagination.hasPrev && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/transactions/swiping?page=${page - 1}`}>← Prev</Link>
              </Button>
            )}
            {pagination.hasNext && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/transactions/swiping?page=${page + 1}`}>Next →</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600",
        right && "text-right"
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  mono,
  className,
  title,
}: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <td
      className={cn("whitespace-nowrap px-3 py-2", right && "text-right", mono && "font-mono tabular-nums", className)}
      title={title}
    >
      {children}
    </td>
  );
}
