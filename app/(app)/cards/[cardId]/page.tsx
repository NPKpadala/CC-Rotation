import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  CreditCard as CardIcon,
  Edit2,
  Copy as CopyIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CardDocEditForm } from "@/components/forms/CardDocEditForm";
import { CardNumberCopyButton } from "@/components/cards/CardNumberCopyButton";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";
import { formatCardNumberDisplay } from "@/lib/calc-shared";
import { CARD_NETWORK_LABELS, CARD_TYPE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CardDetailPage({
  params,
  searchParams,
}: {
  params: { cardId: string };
  searchParams: { mode?: string };
}) {
  const session = await auth();
  const mode = searchParams.mode === "edit" ? "edit" : "view";

  const card = await prisma.card.findUnique({
    where: { id: params.cardId },
    include: {
      profile: true,
      transactions: {
        orderBy: { transactionDate: "desc" },
        take: 100,
      },
    },
  });

  if (!card) notFound();

  // ─── Edit Mode ───────────────────────────────────────────────────────────
  if (mode === "edit") {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href={`/cards/${card.id}?mode=view`}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" /> Back to view
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Edit Card Documents
          </h1>
          <p className="text-sm text-slate-500">
            {card.bankName.replace(/_/g, " ")} •••• {card.cardNumberLast4} ·{" "}
            {card.profile.name}
          </p>
        </div>

        <CardDocEditForm
          card={{
            id: card.id,
            bankName: card.bankName,
            bankNameOther: card.bankNameOther,
            cardNetwork: card.cardNetwork,
            cardType: card.cardType,
            cardNumberLast4: card.cardNumberLast4,
            cardNumberFull: card.cardNumberFull,
            cardExpireMonth: card.cardExpireMonth,
            cardExpireYear: card.cardExpireYear,
            holderName: card.holderName,
            holderMobile: card.holderMobile,
            holderAltMobile: card.holderAltMobile,
            isPrimary: card.isPrimary,
            status: card.status,
            swipeAttemptCount: card.swipeAttemptCount,
            defaultPercentage: card.defaultPercentage,
            aadharFrontUrl: card.aadharFrontUrl,
            aadharBackUrl: card.aadharBackUrl,
            panCardUrl: card.panCardUrl,
            localProofUrl: card.localProofUrl,
            cardFrontUrl: card.cardFrontUrl,
            cardBackUrl: card.cardBackUrl,
            profileId: card.profileId,
          }}
        />
      </div>
    );
  }

  // ─── View Mode ───────────────────────────────────────────────────────────
  const totalCharges = card.transactions.reduce((s, t) => s + decimalToNumber(t.charges), 0);
  const totalSwiped = card.transactions.reduce((s, t) => s + decimalToNumber(t.swipeAmount), 0);
  const totalPending = card.transactions
    .filter((t) => t.status === "PENDING")
    .reduce((s, t) => s + decimalToNumber(t.afterClearPending), 0);

  // v1.3 — full PAN visible
  const fullDisplay = card.cardNumberFull
    ? formatCardNumberDisplay(card.cardNumberFull)
    : `•••• •••• •••• ${card.cardNumberLast4}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/profiles/${card.profileId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back to {card.profile.name}
        </Link>

        <Button asChild>
          <Link href={`/cards/${card.id}?mode=edit`}>
            <Edit2 className="h-4 w-4" /> Edit Card Documents
          </Link>
        </Button>
      </div>

      <Card className="bg-gradient-to-br from-slate-900 to-primary-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs uppercase opacity-70">{card.bankName.replace(/_/g, " ")}</p>

              {/* v1.3 — full PAN visible by default */}
              <div className="mt-3 flex items-center gap-3">
                <p className="font-mono text-2xl tracking-[0.2em]">{fullDisplay}</p>
                {card.cardNumberFull && (
                  <CardNumberCopyButton value={card.cardNumberFull} />
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-[10px] uppercase opacity-60">Card Holder</p>
                  <p className="font-medium">{card.holderName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase opacity-60">Expires</p>
                  <p className="font-mono">
                    {String(card.cardExpireMonth).padStart(2, "0")}/{card.cardExpireYear}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase opacity-60">Swipes</p>
                  <p className="font-mono">{card.swipeAttemptCount}×</p>
                </div>
              </div>
            </div>
            <CardIcon className="h-10 w-10 opacity-50" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Network</p>
            <p className="mt-1 font-semibold">{CARD_NETWORK_LABELS[card.cardNetwork] ?? card.cardNetwork}</p>
            <p className="text-xs text-slate-500">{Number(card.defaultPercentage).toFixed(2)}% default</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Type</p>
            <p className="mt-1 font-semibold">{CARD_TYPE_LABELS[card.cardType] ?? card.cardType}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Total Charges</p>
            <p className="mt-1 font-semibold text-primary-600">{formatCurrency(totalCharges)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Pending</p>
            <p className={`mt-1 font-semibold ${totalPending > 0 ? "text-orange-600" : "text-green-600"}`}>
              {formatCurrency(totalPending)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Holder Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-slate-500">Name</p>
              <p className="font-medium">{card.holderName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Mobile</p>
              <p className="font-mono">{card.holderMobile}</p>
            </div>
            {card.holderAltMobile && (
              <div>
                <p className="text-xs text-slate-500">Alt Mobile</p>
                <p className="font-mono">{card.holderAltMobile}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Badge variant={card.status === "ACTIVE" ? "success" : "destructive"}>{card.status}</Badge>
            <Badge variant={card.kycStatus === "VERIFIED" ? "success" : "warning"} className="ml-2">
              KYC: {card.kycStatus}
            </Badge>
            <p className="mt-3 text-xs text-slate-500">
              Total Swiped: <span className="font-mono font-medium">{formatCurrency(totalSwiped)}</span>
            </p>
            <p className="text-xs text-slate-500">
              Transactions: <span className="font-medium">{card.transactions.length}</span>
            </p>
            <p className="text-xs text-slate-500">
              Swipe attempts: <span className="font-medium">{card.swipeAttemptCount}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {[
              ["Aadhaar Front", card.aadharFrontUrl],
              ["Aadhaar Back", card.aadharBackUrl],
              ["PAN Card", card.panCardUrl],
              ["Local Proof", card.localProofUrl],
              ["Card Front", card.cardFrontUrl],
              ["Card Back", card.cardBackUrl],
            ].map(([name, url]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-slate-600">{name}</span>
                {url ? (
                  <a href={url as string} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">View</a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions on This Card</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {card.transactions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No transactions on this card yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Charges</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {card.transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{formatDate(t.transactionDate)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{t.type.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-sm">{t.customerName}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(decimalToNumber(t.paidAmount))}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-primary-600">{formatCurrency(decimalToNumber(t.charges))}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(decimalToNumber(t.afterClearPending))}</TableCell>
                    <TableCell><Badge variant={t.status === "CLEARED" ? "success" : "warning"}>{t.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
