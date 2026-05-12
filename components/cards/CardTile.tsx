"use client";

import Link from "next/link";
import { useState } from "react";
import { CreditCard, Star, Wifi, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { formatCardNumberDisplay } from "@/lib/calc-shared";

interface CardTileProps {
  card: {
    id: string;
    bankName: string;
    cardNumberLast4: string;
    cardNumberFull?: string | null; // ADDED v1.3 — visible by default
    cardNetwork: string;
    holderName: string;
    defaultPercentage: number | string;
    cardExpireMonth: number;
    cardExpireYear: number;
    status: string;
    isPrimary?: boolean;
    swipeAttemptCount?: number;
  };
  pendingAmount: number;
  transactionCount: number;
}

const NETWORK_GRADIENTS: Record<string, string> = {
  VISA: "from-blue-700 via-blue-800 to-indigo-900",
  RUPAY: "from-orange-500 via-orange-600 to-red-700",
  MASTERCARD: "from-rose-700 via-red-800 to-rose-900",
  HDFC_RUPAY: "from-orange-600 via-amber-700 to-orange-900",
  HDFC_MASTER: "from-red-700 via-rose-800 to-red-900",
  AMERICAN_EXPRESS: "from-emerald-700 via-teal-800 to-emerald-900",
  DINERS_CLUB: "from-violet-700 via-purple-800 to-violet-900",
  OTHER: "from-slate-700 via-slate-800 to-slate-900",
};

export function CardTile({ card, pendingAmount, transactionCount }: CardTileProps) {
  const gradient = NETWORK_GRADIENTS[card.cardNetwork] ?? NETWORK_GRADIENTS.OTHER;
  const isInactive = card.status !== "ACTIVE";
  const [copied, setCopied] = useState(false);

  // v1.3: full number always visible (no Reveal button)
  const fullNumber = card.cardNumberFull ?? null;
  const display = fullNumber
    ? formatCardNumberDisplay(fullNumber)
    : `•••• •••• •••• ${card.cardNumberLast4}`; // legacy fallback for cards added before v1.3

  function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!fullNumber) return;
    navigator.clipboard.writeText(fullNumber).then(() => {
      setCopied(true);
      toast.success("Card number copied");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Link
      href={`/cards/${card.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-2xl text-white shadow-md transition-all",
        "hover:-translate-y-0.5 hover:shadow-xl",
        "bg-gradient-to-br",
        gradient,
        isInactive && "opacity-60"
      )}
    >
      <div className="absolute right-4 top-4 opacity-30">
        <Wifi className="h-5 w-5 -rotate-90" />
      </div>

      {card.isPrimary && (
        <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-900">
          <Star className="h-2.5 w-2.5 fill-current" /> PRIMARY
        </div>
      )}

      <div className="relative p-5">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
            {card.bankName.replace(/_/g, " ")}
          </p>
        </div>

        <div className="mt-6">
          {/* v1.3 — Full PAN visible inline + copy button */}
          <div className="flex items-center gap-2">
            <p className="font-mono text-base tracking-[0.15em]">{display}</p>
            {fullNumber && (
              <button
                type="button"
                onClick={copy}
                className="rounded-md bg-white/15 p-1 hover:bg-white/25"
                title="Copy card number"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase opacity-60">Holder</p>
            <p className="text-xs font-semibold uppercase">{card.holderName}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase opacity-60">Expires</p>
            <p className="font-mono text-xs">
              {String(card.cardExpireMonth).padStart(2, "0")}/{String(card.cardExpireYear).slice(-2)}
            </p>
          </div>
          <div className="text-right">
            <CreditCard className="h-6 w-6 opacity-40" />
          </div>
        </div>
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-4 divide-x divide-white/10 border-t border-white/10 bg-black/20 px-2 py-2 backdrop-blur-sm">
        <div className="px-2 text-center">
          <p className="text-[9px] uppercase opacity-70">Pending</p>
          <p className="font-mono text-xs font-semibold tabular-nums">
            {pendingAmount > 0 ? formatCurrency(pendingAmount) : "—"}
          </p>
        </div>
        <div className="px-2 text-center">
          <p className="text-[9px] uppercase opacity-70">Txns</p>
          <p className="font-mono text-xs font-semibold tabular-nums">{transactionCount}</p>
        </div>
        <div className="px-2 text-center">
          <p className="text-[9px] uppercase opacity-70">Swipes</p>
          <p className="font-mono text-xs font-semibold tabular-nums">{card.swipeAttemptCount ?? 0}×</p>
        </div>
        <div className="px-2 text-center">
          <p className="text-[9px] uppercase opacity-70">Default %</p>
          <p className="font-mono text-xs font-semibold tabular-nums">{Number(card.defaultPercentage).toFixed(2)}%</p>
        </div>
      </div>

      {isInactive && (
        <div className="absolute left-3 top-3 z-10">
          <Badge variant="destructive" className="text-[10px]">{card.status}</Badge>
        </div>
      )}
    </Link>
  );
}
