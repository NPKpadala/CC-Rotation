"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, ChevronLeft, Lock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PhotoUpload } from "@/components/shared/PhotoUpload";
import { updateCardDocs } from "@/actions/card.actions";
import { formatCardNumberDisplay } from "@/lib/calc-shared";

interface CardDocEditFormProps {
  card: {
    id: string;
    bankName: string;
    bankNameOther: string | null;
    cardNetwork: string;
    cardType: string;
    cardNumberLast4: string;
    cardNumberFull: string | null;
    cardExpireMonth: number;
    cardExpireYear: number;
    holderName: string;
    holderMobile: string;
    holderAltMobile: string | null;
    isPrimary: boolean;
    status: string;
    swipeAttemptCount: number;
    defaultPercentage: unknown;
    aadharFrontUrl: string | null;
    aadharBackUrl: string | null;
    panCardUrl: string | null;
    localProofUrl: string | null;
    cardFrontUrl: string | null;
    cardBackUrl: string | null;
    profileId: string;
  };
}

export function CardDocEditForm({ card }: CardDocEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const r = await updateCardDocs(card.id, fd);
      if (!r.success) {
        setError(r.error ?? "Failed");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Card documents updated");
      router.push(`/cards/${card.id}?mode=view`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">✏️ Edit Mode (Documents Only)</p>
          <p className="text-xs text-amber-700">
            Card number, expiry, holder details — all locked. Only KYC documents and card photos are editable.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/cards/${card.id}?mode=view`)}
            disabled={isPending}
          >
            <ChevronLeft className="h-4 w-4" /> Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4" /> Save Documents</>
            )}
          </Button>
        </div>
      </div>

      {/* LOCKED card info */}
      <Card className="border-slate-200 bg-slate-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-slate-400" /> Card Information (locked)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Locked label="Bank" value={card.bankNameOther || card.bankName.replace(/_/g, " ")} />
          <Locked label="Network" value={card.cardNetwork.replace(/_/g, " ")} />
          <Locked label="Type" value={card.cardType} />
          <Locked
            label="Card Number"
            value={
              card.cardNumberFull
                ? formatCardNumberDisplay(card.cardNumberFull)
                : `•••• ${card.cardNumberLast4}`
            }
            mono
          />
          <Locked
            label="Expiry"
            value={`${String(card.cardExpireMonth).padStart(2, "0")}/${card.cardExpireYear}`}
            mono
          />
          <Locked label="Holder Name" value={card.holderName} />
          <Locked label="Holder Mobile" value={card.holderMobile} mono />
          <Locked
            label="Default %"
            value={`${Number(card.defaultPercentage ?? 0).toFixed(2)}%`}
            mono
          />
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-500">Status</p>
            <div className="mt-1">
              <Badge variant={card.status === "ACTIVE" ? "success" : "destructive"}>{card.status}</Badge>
              {card.isPrimary && <Badge variant="warning" className="ml-1">PRIMARY</Badge>}
            </div>
          </div>
          <Locked label="Swipe count" value={`${card.swipeAttemptCount}× all-time`} />
        </CardContent>
      </Card>

      {/* EDITABLE Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KYC Documents (editable)</CardTitle>
          <p className="text-xs text-slate-500">
            New uploads silently overwrite existing files.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PhotoUpload
            name="aadharFrontUrl"
            label="Aadhaar Front"
            defaultUrl={card.aadharFrontUrl ?? undefined}
          />
          <PhotoUpload
            name="aadharBackUrl"
            label="Aadhaar Back"
            defaultUrl={card.aadharBackUrl ?? undefined}
          />
          <PhotoUpload
            name="panCardUrl"
            label="PAN Card"
            defaultUrl={card.panCardUrl ?? undefined}
          />
          <PhotoUpload
            name="localProofUrl"
            label="Local Proof"
            documentMode
            defaultUrl={card.localProofUrl ?? undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Card Photos (editable)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PhotoUpload
            name="cardFrontUrl"
            label="Card Front"
            defaultUrl={card.cardFrontUrl ?? undefined}
          />
          <PhotoUpload
            name="cardBackUrl"
            label="Card Back"
            defaultUrl={card.cardBackUrl ?? undefined}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="inline-flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/cards/${card.id}?mode=view`)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <><Save className="h-4 w-4" /> Save Documents</>
          )}
        </Button>
      </div>
    </form>
  );
}

function Locked({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-medium text-slate-700 ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}
