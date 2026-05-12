"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Calculator as CalcIcon,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createArdSwipe } from "@/actions/swiping.actions";
import { BANK_NAMES, PAYMENT_GATEWAYS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { computeArdSwipePreview, formatCardNumberDisplay, expectedCardLength } from "@/lib/calc-shared";
import { cn } from "@/lib/utils";
import { GatewaySelect } from "@/components/forms/GatewaySelect";

interface ProfileOption {
  id: string;
  name: string;
  mobile: string;
}
interface CardOption {
  id: string;
  bankName: string;
  cardNumberLast4: string;
  cardNumberFull: string | null;
  cardNetwork: string;
  defaultPercentage: number;
  profileId: string;
  swipeAttemptCount: number;
}

export function ArdSwipeForm({
  profiles,
  cards,
  defaultProfileId,
  onComplete,
}: {
  profiles: ProfileOption[];
  cards: CardOption[];
  defaultProfileId?: string;
  onComplete?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ─── Form state ───────────────────────────────────────────────────────────
  const [selectedProfileId, setSelectedProfileId] = useState(
    defaultProfileId ?? profiles[0]?.id ?? ""
  );
  const [swipeSource, setSwipeSource] = useState<"SAME" | "OTHER">("SAME");
  const [selectedCardId, setSelectedCardId] = useState("");

  const [swipeAmount, setSwipeAmount] = useState("");
  const [percentage, setPercentage] = useState("2.5");
  const [extraChargesInRs, setExtraChargesInRs] = useState("0");
  const [sentToCustomer, setSentToCustomer] = useState("");
  const [sentAccount, setSentAccount] = useState("");
  const [ourCharges, setOurCharges] = useState("0");

  // OTHER card fields
  const [otherBank, setOtherBank] = useState("");
  const [otherNetwork, setOtherNetwork] = useState("VISA");
  const [otherCardNumber, setOtherCardNumber] = useState("");
  const [otherExpiry, setOtherExpiry] = useState("");

  const profileCards = cards.filter((c) => c.profileId === selectedProfileId);
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const selectedCard = cards.find((c) => c.id === selectedCardId);
  const nextAttempt = selectedCard ? selectedCard.swipeAttemptCount + 1 : null;

  // Reset card selection when profile changes
  useEffect(() => {
    setSelectedCardId("");
  }, [selectedProfileId]);

  // Auto-fill % from card default when SAME card chosen
  useEffect(() => {
    if (swipeSource === "SAME" && selectedCard) {
      setPercentage(String(selectedCard.defaultPercentage));
    }
  }, [selectedCard, swipeSource]);

  // ─── Live preview ──────────────────────────────────────────────────────────
  const preview = useMemo(
    () =>
      computeArdSwipePreview({
        swipeAmount: parseFloat(swipeAmount) || 0,
        percentage: parseFloat(percentage) || 0,
        extraChargesInRs: parseFloat(extraChargesInRs) || 0,
        sentToCustomer: parseFloat(sentToCustomer) || 0,
        ourCharges: parseFloat(ourCharges) || 0,
      }),
    [swipeAmount, percentage, extraChargesInRs, sentToCustomer, ourCharges]
  );

  const otherCardLengths = expectedCardLength(otherNetwork);
  const otherCardClean = otherCardNumber.replace(/\D/g, "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("swipeSource", swipeSource);
    if (swipeSource === "OTHER") {
      fd.set("otherCardNumber", otherCardClean);
    }

    startTransition(async () => {
      const r = await createArdSwipe(fd);
      if (!r.success) {
        setError(r.error ?? "Failed");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("ARD Swipe recorded");
      // Reset
      setSwipeAmount("");
      setSentToCustomer("");
      setSentAccount("");
      setOurCharges("0");
      setExtraChargesInRs("0");
      setOtherCardNumber("");
      setSelectedCardId("");
      onComplete?.();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-6 lg:grid-cols-3"
    >
      <div className="space-y-6 lg:col-span-2">
        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="profileId">Profile *</Label>
              <Select
                id="profileId"
                name="profileId"
                required
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
              >
                <option value="">— Select customer —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mobile})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                name="customerName"
                required
                defaultValue={selectedProfile?.name ?? ""}
                key={selectedProfileId + "n"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerMobile">Customer Mobile *</Label>
              <Input
                id="customerMobile"
                name="customerMobile"
                required
                pattern="[6-9]\d{9}"
                maxLength={10}
                inputMode="numeric"
                defaultValue={selectedProfile?.mobile ?? ""}
                key={selectedProfileId + "m"}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="transactionDate">Date *</Label>
              <Input
                id="transactionDate"
                name="transactionDate"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Swiped Card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              {(["SAME", "OTHER"] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSwipeSource(src)}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                    swipeSource === src
                      ? "bg-primary-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {src === "SAME" ? "Same as profile" : "Other card (one-time)"}
                </button>
              ))}
            </div>

            {swipeSource === "SAME" && (
              <div className="space-y-2">
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
                      {c.bankName} {c.cardNetwork}{" "}
                      {c.cardNumberFull
                        ? formatCardNumberDisplay(c.cardNumberFull)
                        : `••••${c.cardNumberLast4}`}{" "}
                      ({c.defaultPercentage}%) · swiped {c.swipeAttemptCount}×
                    </option>
                  ))}
                </Select>
                {!profileCards.length && selectedProfileId && (
                  <p className="text-xs text-orange-600">
                    This profile has no cards. Add a card first or pick "Other card".
                  </p>
                )}
                {nextAttempt && (
                  <p className="inline-flex items-center gap-1 text-xs text-primary-600">
                    <RefreshCw className="h-3 w-3" /> This will be attempt #{nextAttempt} on this card
                  </p>
                )}
              </div>
            )}

            {swipeSource === "OTHER" && (
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-4 md:grid-cols-2">
                <p className="md:col-span-2 text-xs font-semibold text-amber-800">
                  Other Card Details (one-time, not saved as a card)
                </p>
                <div className="space-y-2">
                  <Label htmlFor="otherBank">Bank *</Label>
                  <Select
                    id="otherBank"
                    name="otherBank"
                    required={swipeSource === "OTHER"}
                    value={otherBank}
                    onChange={(e) => setOtherBank(e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {BANK_NAMES.map((b) => (
                      <option key={b} value={b}>{b.replace(/_/g, " ")}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherNetwork">Network *</Label>
                  <Select
                    id="otherNetwork"
                    name="otherNetwork"
                    required={swipeSource === "OTHER"}
                    value={otherNetwork}
                    onChange={(e) => setOtherNetwork(e.target.value)}
                  >
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
                  <Input
                    id="otherCardNumber"
                    name="otherCardNumber-display"
                    required={swipeSource === "OTHER"}
                    inputMode="numeric"
                    maxLength={19}
                    value={formatCardNumberDisplay(otherCardClean)}
                    onChange={(e) =>
                      setOtherCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))
                    }
                  />
                  <p className="text-[11px] text-slate-500">
                    {otherCardClean.length} digit(s) · expected {otherCardLengths.join(" or ")}
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="otherExpiry">Expiry (MM/YY)</Label>
                  <Input
                    id="otherExpiry"
                    name="otherExpiry"
                    placeholder="12/29"
                    pattern="\d{2}/\d{2,4}"
                    maxLength={7}
                    value={otherExpiry}
                    onChange={(e) => setOtherExpiry(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Swipe details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Swipe Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="swipeAmount">Swipe Amount (₹) *</Label>
              <Input
                id="swipeAmount"
                name="swipeAmount"
                type="number"
                step="0.01"
                min="1"
                required
                value={swipeAmount}
                onChange={(e) => setSwipeAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="percentage">Percentage % *</Label>
              <Input
                id="percentage"
                name="percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
              />
              {swipeSource === "SAME" && selectedCard && (
                <p className="text-[11px] text-slate-500">
                  Card default: {selectedCard.defaultPercentage}%
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="extraChargesInRs">Extra Charges in ₹</Label>
              <Input
                id="extraChargesInRs"
                name="extraChargesInRs"
                type="number"
                step="0.01"
                min="0"
                value={extraChargesInRs}
                onChange={(e) => setExtraChargesInRs(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <GatewaySelect
                id="swipeGateway"
                name="swipeGateway"
                required
                label="Swipe Site / Gateway *"
                defaultValue="MOS"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sentToCustomer">Sent to Customer (₹)</Label>
              <Input
                id="sentToCustomer"
                name="sentToCustomer"
                type="number"
                step="0.01"
                min="0"
                value={sentToCustomer}
                onChange={(e) => setSentToCustomer(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sentAccount">Sent Account</Label>
              <Input
                id="sentAccount"
                name="sentAccount"
                placeholder="Account number / UPI / wallet ID"
                value={sentAccount}
                onChange={(e) => setSentAccount(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ourCharges">Our Charges (₹)</Label>
              <Input
                id="ourCharges"
                name="ourCharges"
                type="number"
                step="0.01"
                min="0"
                value={ourCharges}
                onChange={(e) => setOurCharges(e.target.value)}
              />
              <p className="text-[11px] text-slate-500">
                What we keep / pay to gateway. Profit = Charges − Our Charges.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" name="remarks" rows={2} />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <Button type="submit" disabled={isPending} className="w-full md:w-auto">
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <><Save className="h-4 w-4" /> Save ARD Swipe</>
          )}
        </Button>
      </div>

      {/* Live Preview */}
      <div>
        <Card className="sticky top-20 border-primary-200 bg-gradient-to-br from-primary-50/50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalcIcon className="h-4 w-4 text-primary-600" /> Live Calculation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2.5 text-sm">
              <Row label="Swipe Amount" value={formatCurrency(parseFloat(swipeAmount) || 0)} />
              <Row label={`Percentage`} value={`${percentage || 0}%`} />
              <Separator />
              <Row label="Charges (% × swipe)" value={formatCurrency((parseFloat(swipeAmount) || 0) * (parseFloat(percentage) || 0) / 100)} />
              <Row label="+ Extra Charges" value={formatCurrency(parseFloat(extraChargesInRs) || 0)} />
              <Row label="Total Charges" value={formatCurrency(preview.charges)} bold highlight />
              <Separator />
              <Row label="Balance Amount" value={formatCurrency(preview.balanceAmount)} />
              <Row label="Sent to Customer" value={formatCurrency(parseFloat(sentToCustomer) || 0)} />
              <Separator />
              <div className="rounded-lg border-2 p-3 text-center"
                style={{
                  borderColor: preview.pendingToCustomer < -0.01 ? "#fb923c" : preview.pendingToCustomer > 0.01 ? "#fb923c" : "#86efac",
                  backgroundColor: preview.pendingToCustomer < -0.01 ? "#fff7ed" : preview.pendingToCustomer > 0.01 ? "#fff7ed" : "#f0fdf4",
                }}
              >
                <p className="text-[10px] uppercase font-semibold text-slate-500">Pending to Customer</p>
                <p
                  className={cn(
                    "mt-1 font-mono text-2xl font-bold tabular-nums",
                    preview.pendingToCustomer < -0.01 ? "text-orange-700" :
                    preview.pendingToCustomer > 0.01 ? "text-orange-700" :
                    "text-green-700"
                  )}
                >
                  {formatCurrency(preview.pendingToCustomer)}
                </p>
                <p className="mt-1 text-[10px] text-slate-600">
                  {preview.pendingToCustomer < -0.01
                    ? "⚠ We sent extra — customer owes us"
                    : preview.pendingToCustomer > 0.01
                    ? "⚠ Customer underpaid — owe customer"
                    : "✅ Settled"}
                </p>
              </div>

              <Separator />
              <Row label="Our Charges" value={formatCurrency(parseFloat(ourCharges) || 0)} />
              <Row
                label="Profit"
                value={formatCurrency(preview.profit)}
                bold
                highlight={preview.profit >= 0}
                negative={preview.profit < 0}
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
  negative,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-600">{label}</dt>
      <dd
        className={cn(
          "font-mono tabular-nums",
          bold ? "font-bold" : "font-medium",
          highlight ? "text-primary-700" : negative ? "text-red-600" : "text-slate-900"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
