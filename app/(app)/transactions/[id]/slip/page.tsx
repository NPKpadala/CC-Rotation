import { notFound } from "next/navigation";
import { ChevronLeft, Printer, MessageCircle } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";
import { formatCardNumberDisplay } from "@/lib/calc-shared";
import { WhatsAppShareButton } from "@/components/shared/WhatsAppShareButton";

export const dynamic = "force-dynamic";

export default async function TransactionSlipPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const tx = await prisma.transaction.findFirst({
    where: { OR: [{ id: params.id }, { transactionId: params.id }] },
    include: {
      profile: { select: { name: true, mobile: true } },
      card: {
        select: {
          bankName: true,
          cardNumberLast4: true,
          cardNumberFull: true,
          cardNetwork: true,
        },
      },
      createdBy: { select: { name: true } },
    },
  });

  if (!tx) notFound();

  const [settings] = await Promise.all([
    prisma.systemSetting.findMany({
      where: { key: { in: ["company_name", "whatsapp_message_template"] } },
    }),
  ]);
  const companyName = settings.find((s) => s.key === "company_name")?.value ?? "Sahsra CC Rotations";
  const template = settings.find((s) => s.key === "whatsapp_message_template")?.value;

  const cardDisplay = tx.card
    ? `${tx.card.bankName.replace(/_/g, " ")} ••${tx.card.cardNumberLast4}`
    : tx.cardNameUsed ?? "—";

  return (
    <>
      {/* Hide nav chrome via print CSS; keep top-bar for screen only */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A5; margin: 10mm; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={
            tx.type === "BILL_PAYMENT"
              ? `/transactions/payments/${tx.id}/edit`
              : "/transactions/swiping"
          }
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex flex-wrap gap-2">
          <WhatsAppShareButton
            customerName={tx.customerName}
            customerMobile={tx.customerMobile}
            transactionId={tx.transactionId ?? tx.id.slice(0, 8)}
            transactionDate={formatDate(tx.transactionDate)}
            cardLast4={tx.card?.cardNumberLast4 ?? "—"}
            paidAmount={decimalToNumber(tx.paidAmount)}
            charges={decimalToNumber(tx.charges)}
            clearedTotal={decimalToNumber(tx.clearedTotal)}
            status={tx.status}
            companyName={companyName}
            template={template}
          />
          <Button onClick={() => {}} asChild>
            <a
              href="javascript:window.print()"
              className="inline-flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" /> Print
            </a>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[148mm] rounded-lg border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        {/* Header */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{companyName}</h1>
              <p className="text-xs text-slate-500">Manual Card Rotation Ledger</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase text-slate-500">Transaction ID</p>
              <p className="font-mono text-base font-bold text-primary-700">
                {tx.transactionId ?? `id:${tx.id.slice(0, 8)}…`}
              </p>
            </div>
          </div>
        </div>

        {/* Type + Status */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {tx.type.replace("_", " ")}
          </Badge>
          <Badge variant={tx.status === "CLEARED" ? "success" : "warning"}>{tx.status}</Badge>
          <span className="ml-auto text-xs text-slate-500">{formatDate(tx.transactionDate)}</span>
        </div>

        {/* Customer */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Row label="Customer" value={tx.customerName} />
          <Row label="Mobile" value={tx.customerMobile} mono />
          <Row label="Card" value={cardDisplay} mono />
          <Row label="Gateway" value={tx.paymentGateway || tx.swipeGateway || "—"} />
        </div>

        {/* Amounts */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase text-slate-500">Amounts</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            <Row label="Paid Amount" value={formatCurrency(decimalToNumber(tx.paidAmount))} mono />
            {tx.swipeAmount !== null && Number(tx.swipeAmount) > 0 && (
              <Row label="Swipe Amount" value={formatCurrency(decimalToNumber(tx.swipeAmount))} mono />
            )}
            <Row
              label={`Charges (${Number(tx.percentage).toFixed(2)}%)`}
              value={formatCurrency(decimalToNumber(tx.charges))}
              mono
              accent="primary"
            />
            {decimalToNumber(tx.siteCharges) > 0 && (
              <Row
                label="Site Charges"
                value={formatCurrency(decimalToNumber(tx.siteCharges))}
                mono
              />
            )}
            {decimalToNumber(tx.ardOurCharges) > 0 && (
              <Row
                label="Our Charges"
                value={formatCurrency(decimalToNumber(tx.ardOurCharges))}
                mono
              />
            )}
          </div>
        </div>

        {/* Cleared breakdown (bill payments only) */}
        {tx.type === "BILL_PAYMENT" && (
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
            <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">Cleared Breakdown</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-slate-500">PhonePe</p>
                <p className="font-mono">{formatCurrency(decimalToNumber(tx.clearedPhonePe))}</p>
              </div>
              <div>
                <p className="text-slate-500">Wallet</p>
                <p className="font-mono">{formatCurrency(decimalToNumber(tx.clearedWallet))}</p>
              </div>
              <div>
                <p className="text-slate-500">Cash</p>
                <p className="font-mono">{formatCurrency(decimalToNumber(tx.clearedCash))}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-1.5">
              <span className="text-xs font-semibold text-slate-700">Cleared Total</span>
              <span className="font-mono text-sm font-bold">
                {formatCurrency(decimalToNumber(tx.clearedTotal))}
              </span>
            </div>
          </div>
        )}

        {/* Pending */}
        <div className="mt-3 rounded-lg border-2 border-orange-200 bg-orange-50/60 p-3 text-center">
          <p className="text-[10px] uppercase font-semibold text-slate-500">
            {tx.type === "BILL_PAYMENT" ? "Customer Today Pending" : "Pending to Customer"}
          </p>
          <p className="font-mono text-xl font-bold text-orange-700">
            {formatCurrency(
              decimalToNumber(
                tx.type === "BILL_PAYMENT" ? tx.customerTodayPending : tx.pendingToCustomer
              )
            )}
          </p>
        </div>

        {/* Profit (admin only) */}
        {isAdmin && (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Row
              label="Profit"
              value={formatCurrency(decimalToNumber(tx.profit))}
              mono
              accent={decimalToNumber(tx.profit) >= 0 ? "success" : "danger"}
            />
          </div>
        )}

        {/* Remarks */}
        {tx.remarks && (
          <div className="mt-3 border-t border-slate-100 pt-2">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Remarks</p>
            <p className="text-sm text-slate-700">{tx.remarks}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 border-t border-slate-200 pt-3 text-center">
          <p className="text-[10px] text-slate-400">
            Generated by Sahsra CC Rotations · Recorded by {tx.createdBy?.name ?? "—"} ·{" "}
            {new Date().toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[10px] text-slate-300">Powered by NPKpadala</p>
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: "primary" | "success" | "danger";
}) {
  const cls =
    accent === "primary"
      ? "text-primary-700 font-semibold"
      : accent === "success"
      ? "text-green-700 font-semibold"
      : accent === "danger"
      ? "text-red-700 font-semibold"
      : "text-slate-900";
  return (
    <div>
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className={`${cls} ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}
