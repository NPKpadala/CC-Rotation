"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSwipe } from "@/actions/swiping.actions";
import { BANK_NAMES, PAYMENT_GATEWAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ProfileOption {
  id: string;
  name: string;
  mobile: string;
}
interface CardOption {
  id: string;
  bankName: string;
  cardNumberLast4: string;
  cardNetwork: string;
  defaultPercentage: number;
  profileId: string;
  swipeAttemptCount?: number;
}

export function SwipeForm({ profiles, cards }: { profiles: ProfileOption[]; cards: CardOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.id ?? "");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [swipedCardSource, setSwipedCardSource] = useState<"SAME" | "OTHER">("SAME");

  const profileCards = cards.filter((c) => c.profileId === selectedProfileId);
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const selectedCard = cards.find((c) => c.id === selectedCardId);
  const nextAttempt = selectedCard ? (selectedCard.swipeAttemptCount ?? 0) + 1 : null;

  useEffect(() => {
    setSelectedCardId("");
  }, [selectedProfileId]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("swipedCardSource", swipedCardSource);

    startTransition(async () => {
      const r = await createSwipe(fd);
      if (!r.success) {
        setError(r.error ?? "Failed");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Swipe recorded");
      router.refresh();
      (e.target as HTMLFormElement).reset();
      setSelectedCardId("");
      setSwipedCardSource("SAME");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Card Swipe</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="profileId">Profile *</Label>
            <Select id="profileId" name="profileId" required value={selectedProfileId} onChange={(e) => setSelectedProfileId(e.target.value)}>
              <option value="">— Select —</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.mobile})</option>)}
            </Select>
          </div>

          {/* ADDED v1.2 — SAME / OTHER toggle */}
          <div className="md:col-span-2">
            <Label className="mb-2 block">Swiped Card *</Label>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              {(["SAME", "OTHER"] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSwipedCardSource(src)}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                    swipedCardSource === src
                      ? "bg-primary-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {src === "SAME" ? "Same as profile" : "Other card"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {swipedCardSource === "SAME"
                ? "Use one of the customer's existing cards"
                : "Different card brought by customer (one-time, not saved)"}
            </p>
          </div>

          {swipedCardSource === "SAME" && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cardId">Card *</Label>
              <Select
                id="cardId"
                name="cardId"
                required
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                disabled={!profileCards.length}
              >
                <option value="">— Select card —</option>
                {profileCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.bankName} {c.cardNetwork} ****{c.cardNumberLast4} ({c.defaultPercentage}%) · swiped {c.swipeAttemptCount ?? 0}×
                  </option>
                ))}
              </Select>
              {!profileCards.length && selectedProfileId && (
                <p className="text-xs text-orange-600">This profile has no cards. Add a card first or choose "Other card".</p>
              )}
              {nextAttempt && (
                <p className="inline-flex items-center gap-1 text-xs text-primary-600">
                  <RefreshCw className="h-3 w-3" /> This will be attempt #{nextAttempt} on this card
                </p>
              )}
            </div>
          )}

          {/* ADDED v1.2 — OTHER card details */}
          {swipedCardSource === "OTHER" && (
            <div className="md:col-span-2 grid grid-cols-1 gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-amber-800">Other Card Details (one-time, not saved)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherBankName">Bank *</Label>
                <Select id="otherBankName" name="otherBankName" required defaultValue="">
                  <option value="">— Select —</option>
                  {BANK_NAMES.map((b) => <option key={b} value={b}>{b.replace(/_/g, " ")}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherCardNetwork">Network *</Label>
                <Select id="otherCardNetwork" name="otherCardNetwork" required defaultValue="VISA">
                  <option value="VISA">Visa</option>
                  <option value="RUPAY">RuPay</option>
                  <option value="MASTERCARD">MasterCard</option>
                  <option value="DINERS_CLUB">Diners Club</option>
                  <option value="AMERICAN_EXPRESS">American Express</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="otherCardNumber">Card Number (full or last 4) *</Label>
                <Input id="otherCardNumber" name="otherCardNumber" required pattern="\d{4,16}" inputMode="numeric" maxLength={16} placeholder="last 4 digits at minimum" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherCardExpireMonth">Expiry Month</Label>
                <Select id="otherCardExpireMonth" name="otherCardExpireMonth">
                  <option value="">—</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherCardExpireYear">Expiry Year</Label>
                <Select id="otherCardExpireYear" name="otherCardExpireYear">
                  <option value="">—</option>
                  {Array.from({ length: 12 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input id="customerName" name="customerName" required defaultValue={selectedProfile?.name ?? ""} key={selectedProfileId + "n"} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerMobile">Customer Mobile *</Label>
            <Input id="customerMobile" name="customerMobile" required pattern="[6-9]\d{9}" maxLength={10} inputMode="numeric" defaultValue={selectedProfile?.mobile ?? ""} key={selectedProfileId + "m"} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionDate">Date *</Label>
            <Input id="transactionDate" name="transactionDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="swipeAmount">Swipe Amount *</Label>
            <Input id="swipeAmount" name="swipeAmount" type="number" step="0.01" min="1" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="swipeGateway">Swipe Gateway *</Label>
            <Select id="swipeGateway" name="swipeGateway" required defaultValue="PAY1">
              {PAYMENT_GATEWAYS.map((g) => <option key={g} value={g}>{g.replace(/_/g, " ")}</option>)}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manualPercentage">Manual %</Label>
            <Input id="manualPercentage" name="manualPercentage" type="number" step="0.01" min="0" max="100" placeholder="leave blank for default" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sentToCustomer">Sent to Customer</Label>
            <Input id="sentToCustomer" name="sentToCustomer" type="number" step="0.01" min="0" defaultValue="0" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" name="remarks" rows={2} />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{error}</div>
          )}

          <div className="md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Swipe"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
