"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Calculator, CheckCircle2, AlertTriangle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createBillPayment, updateBillPayment } from "@/actions/billPayment.actions";
import { PAYMENT_GATEWAYS, CHARGES_SENT_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import {
  calculateSplitTotal,
  calculatePendingAfterPayment,
  customerTodayPending,
  isTransactionCleared,
  reversePercentage,
  computeBillPaymentPendingPreview,
  computeProfitPreview,
  round2Client,
} from "@/lib/calc-shared";
import { SuccessCopyPopup } from "@/components/shared/SuccessCopyPopup";
import { SplitAmountInput } from "@/components/forms/SplitAmountInput";
import { GatewaySelect } from "@/components/forms/GatewaySelect";
import { useAutoSaveDraft } from "@/lib/hooks/useAutoSaveDraft";
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
  defaultPercentage: string | number;
  profileId: string;
}

interface InitialValues {
  id?: string;
  profileId?: string;
  cardId?: string;
  transactionDate?: string;
  customerName?: string;
  customerMobile?: string;
  dueAmount?: number;
  paidAmountRaw?: string;
  paymentGateway?: string;
  swipeAmountRaw?: string;
  swipeGateway?: string;
  percentage?: number;
  charges?: number;
  clearedAmount?: number;
  extraSwipedPercent?: number;
  siteCharges?: number;
  pendingHeldBy?: string;
  chargesSentType?: string;
  remarks?: string;
  cardNameUsed?: string;
  clearedPhonePe?: number;
  clearedWallet?: number;
  clearedCash?: number;
  status?: string;
}

interface BillPaymentFormProps {
  profiles: ProfileOption[];
  cards: CardOption[];
  defaultProfileId?: string;
  initial?: InitialValues; // ADDED v1.2 — for edit mode
  isEdit?: boolean;
  isLocked?: boolean; // ADDED v1.2 — true when CLEARED + non-admin
  companyName?: string;
  whatsappTemplate?: string;
}

export function BillPaymentForm({
  profiles,
  cards,
  defaultProfileId,
  initial,
  isEdit = false,
  isLocked = false,
  companyName = "Sahsra CC Rotations",
  whatsappTemplate,
}: BillPaymentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ─── Form state ───────────────────────────────────────────────────────────
  const [selectedProfileId, setSelectedProfileId] = useState(
    initial?.profileId ?? defaultProfileId ?? profiles[0]?.id ?? ""
  );
  const [selectedCardId, setSelectedCardId] = useState(initial?.cardId ?? "");
  const [paidRaw, setPaidRaw] = useState(initial?.paidAmountRaw ?? "");
  const [swipeRaw, setSwipeRaw] = useState(initial?.swipeAmountRaw ?? "");
  const [dueAmount, setDueAmount] = useState(String(initial?.dueAmount ?? "0"));
  const [percentage, setPercentage] = useState(String(initial?.percentage ?? "3"));
  const [charges, setCharges] = useState(String(initial?.charges ?? "0"));
  const [clearedAmount, setClearedAmount] = useState(String(initial?.clearedAmount ?? "0"));
  const [extraSwipedPercent, setExtraSwipedPercent] = useState(String(initial?.extraSwipedPercent ?? "0"));
  const [siteCharges, setSiteCharges] = useState(String(initial?.siteCharges ?? "0"));

  // ADDED v1.2 — Cleared section
  const [clearedPhonePe, setClearedPhonePe] = useState(String(initial?.clearedPhonePe ?? "0"));
  const [clearedWallet, setClearedWallet] = useState(String(initial?.clearedWallet ?? "0"));
  const [clearedCash, setClearedCash] = useState(String(initial?.clearedCash ?? "0"));

  // Track who's the source of last edit (% or charges) to avoid feedback loops
  const [lastEditSource, setLastEditSource] = useState<"percentage" | "charges" | "none">("none");

  // Success popup state
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    customerName: string;
    customerMobile: string;
    paidAmount: number;
    cardLabel: string;
    date: string;
    transactionId?: string; // ADDED v1.4
  } | null>(null);

  const profileCards = cards.filter((c) => c.profileId === selectedProfileId);
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  useEffect(() => {
    if (!isEdit) setSelectedCardId("");
  }, [selectedProfileId, isEdit]);

  // Auto-fill % from card network default
  useEffect(() => {
    const c = cards.find((x) => x.id === selectedCardId);
    if (c && lastEditSource !== "charges") {
      setPercentage(String(c.defaultPercentage));
    }
  }, [selectedCardId, cards, lastEditSource]);

  // ─── Live calculations (client-side preview) ──────────────────────────────
  const paidTotal = useMemo(() => calculateSplitTotal(paidRaw), [paidRaw]);
  const swipeTotal = useMemo(() => calculateSplitTotal(swipeRaw), [swipeRaw]);
  const dueAmountNum = parseFloat(dueAmount) || 0;
  const pendingAfterPayment = calculatePendingAfterPayment(dueAmountNum, paidTotal);

  const clearedPhonePeNum = parseFloat(clearedPhonePe) || 0;
  const clearedWalletNum = parseFloat(clearedWallet) || 0;
  const clearedCashNum = parseFloat(clearedCash) || 0;
  const alreadyClearedNum = parseFloat(clearedAmount) || 0;
  const chargesNum = parseFloat(charges) || 0;
  const siteChargesNum = parseFloat(siteCharges) || 0;

  // v1.4 (A1): CORRECT bill-payment pending formula.
  // totalPayable = paid + charges + siteCharges
  // customerTodayPending = max(totalPayable − (clearedTotal + alreadyCleared), 0)
  const pendingCalc = useMemo(
    () =>
      computeBillPaymentPendingPreview({
        paidAmount: paidTotal,
        charges: chargesNum,
        siteCharges: siteChargesNum,
        clearedPhonePe: clearedPhonePeNum,
        clearedWallet: clearedWalletNum,
        clearedCash: clearedCashNum,
        alreadyCleared: alreadyClearedNum,
      }),
    [
      paidTotal,
      chargesNum,
      siteChargesNum,
      clearedPhonePeNum,
      clearedWalletNum,
      clearedCashNum,
      alreadyClearedNum,
    ]
  );

  const clearedTotal = pendingCalc.clearedTotal;
  const todayPending = pendingCalc.customerTodayPending;
  const isCleared = pendingCalc.isCleared;
  const totalPayable = pendingCalc.totalPayable;

  // v1.4 (A2): Profit = charges + extraSwipedCharges − ourCharges
  // For bill payments, ourCharges = 0. extraSwipedCharges is computed from extraSwiped %
  // server-side; client preview just uses the % portion of swipe.
  const extraSwipedNum = Math.max(swipeTotal - paidTotal, 0);
  const extraSwipedPctNum = parseFloat(extraSwipedPercent) || 0;
  const extraSwipedChargesNum = round2Client((extraSwipedNum * extraSwipedPctNum) / 100);
  const profitPreview = computeProfitPreview({
    charges: chargesNum,
    extraSwipedCharges: extraSwipedChargesNum,
    ourCharges: 0,
  });

  // Live charges from %
  const liveChargesFromPct = useMemo(() => {
    const pct = parseFloat(percentage) || 0;
    return ((paidTotal * pct) / 100).toFixed(2);
  }, [paidTotal, percentage]);

  // Sync charges field with live calc when % is the source
  useEffect(() => {
    if (lastEditSource === "percentage" || lastEditSource === "none") {
      setCharges(liveChargesFromPct);
    }
  }, [liveChargesFromPct, lastEditSource]);

  // ADDED v1.2 — Reverse percentage: when user types charges, recompute %
  function onChargesChange(value: string) {
    setCharges(value);
    setLastEditSource("charges");
    const c = parseFloat(value) || 0;
    if (paidTotal > 0) {
      setPercentage(reversePercentage(c, paidTotal).toString());
    }
  }

  function onPercentageChange(value: string) {
    setPercentage(value);
    setLastEditSource("percentage");
  }

  // Cleared section "quick fill" — fill the rest into cash
  function quickFillCleared() {
    const remaining = paidTotal - swipeTotal - clearedPhonePeNum - clearedWalletNum;
    if (remaining > 0) {
      setClearedCash(remaining.toFixed(2));
      toast.success(`Cash auto-filled: ${formatCurrency(remaining)}`);
    } else {
      toast.info("Nothing left to clear");
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLocked) {
      toast.error("This transaction is locked. Only admins can edit.");
      return;
    }
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const action = isEdit && initial?.id ? updateBillPayment(initial.id, fd) : createBillPayment(fd);
      const r = await action;
      if (!r.success) {
        setError(r.error ?? "Failed");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success(isEdit ? "Transaction updated" : "Bill payment recorded");

      // ADDED v1.2 — Show WhatsApp popup if cleared
      if (r.data?.isCleared && !isEdit) {
        const card = cards.find((c) => c.id === selectedCardId);
        const cardLabel = card ? `${card.bankName} ••${card.cardNumberLast4}` : "—";
        setSuccessData({
          customerName: fd.get("customerName")?.toString() ?? "",
          customerMobile: fd.get("customerMobile")?.toString() ?? "",
          paidAmount: paidTotal,
          cardLabel,
          date: new Date(fd.get("transactionDate")?.toString() ?? Date.now()).toLocaleDateString("en-IN"),
          transactionId: r.data?.transactionId ?? undefined, // v1.4
        });
        setShowSuccess(true);
      } else {
        router.push("/transactions/payments");
        router.refresh();
      }
    });
  }

  return (
    <>
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <fieldset disabled={isLocked} className="contents">
          <div className="space-y-6 lg:col-span-2">
            {isLocked && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                🔒 This transaction is <strong>CLEARED</strong> and locked. Only admins can edit cleared transactions.
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Customer & Card</CardTitle>
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
                    <option value="">— Select profile —</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.mobile})</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardId">Card</Label>
                  <Select
                    id="cardId"
                    name="cardId"
                    value={selectedCardId}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                    disabled={!selectedProfileId}
                  >
                    <option value="">— No specific card —</option>
                    {profileCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.bankName} {c.cardNetwork} ****{c.cardNumberLast4}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardNameUsed">Card Used (label)</Label>
                  <Input id="cardNameUsed" name="cardNameUsed" defaultValue={initial?.cardNameUsed ?? ""} placeholder="e.g. HDFC RuPay" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    required
                    defaultValue={initial?.customerName ?? selectedProfile?.name ?? ""}
                    key={selectedProfileId + "name"}
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
                    defaultValue={initial?.customerMobile ?? selectedProfile?.mobile ?? ""}
                    key={selectedProfileId + "mob"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transactionDate">Transaction Date *</Label>
                  <Input
                    id="transactionDate"
                    name="transactionDate"
                    type="date"
                    required
                    defaultValue={initial?.transactionDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueAmount">Card Due Amount</Label>
                  <Input
                    id="dueAmount"
                    name="dueAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={dueAmount}
                    onChange={(e) => setDueAmount(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* v1.4 (B1) — SplitAmountInput with "+" button */}
                <div className="space-y-1">
                  <SplitAmountInput
                    id="paidAmountRaw"
                    name="paidAmountRaw"
                    required
                    label="Paid Amount (split with +) *"
                    placeholder="500+7000+2500"
                    value={paidRaw}
                    onChange={setPaidRaw}
                  />
                </div>
                {/* v1.4 (B2) — GatewaySelect: picks OTHER → free-text input */}
                <div className="space-y-1">
                  <GatewaySelect
                    id="paymentGateway"
                    name="paymentGateway"
                    required
                    label="Payment Gateway *"
                    defaultValue={initial?.paymentGateway ?? "PAY1"}
                  />
                </div>

                {/* ADDED v1.2 — Live Pending preview */}
                <div className="md:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Pending After Payment</span>
                    <span className={`font-mono font-bold ${pendingAfterPayment > 0 ? "text-orange-600" : "text-green-600"}`}>
                      {formatCurrency(pendingAfterPayment)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Due {formatCurrency(dueAmountNum)} − Total Paid {formatCurrency(paidTotal)}
                  </p>
                </div>

                {/* v1.4 (B1) — Swipe amount with split button */}
                <div className="space-y-1">
                  <SplitAmountInput
                    name="swipeAmountRaw"
                    label="Swipe Amount (optional, split with +)"
                    placeholder="50000+40000"
                    value={swipeRaw}
                    onChange={setSwipeRaw}
                  />
                  {swipeRaw && (
                    <p className="text-[11px] text-slate-500">
                      Total Swipe: <span className="font-mono font-semibold text-slate-900">{formatCurrency(swipeTotal)}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <GatewaySelect
                    id="swipeGateway"
                    name="swipeGateway"
                    label="Swipe Gateway"
                    defaultValue={initial?.swipeGateway ?? ""}
                    allowEmpty
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
                    onChange={(e) => onPercentageChange(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500">Auto-fills from card network default. Or edit charges below.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="charges">Charges (₹) <span className="text-[10px] text-slate-400">edit to recompute %</span></Label>
                  <Input
                    id="charges"
                    name="charges"
                    type="number"
                    step="0.01"
                    min="0"
                    value={charges}
                    onChange={(e) => onChargesChange(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500">
                    {paidTotal > 0 && parseFloat(charges) > 0
                      ? `Effective rate: ${reversePercentage(parseFloat(charges), paidTotal).toFixed(2)}%`
                      : "Auto-calculated from % × paid amount"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clearedAmount">Already Cleared</Label>
                  <Input
                    id="clearedAmount"
                    name="clearedAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={clearedAmount}
                    onChange={(e) => setClearedAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="extraSwipedPercent">Extra Swiped %</Label>
                  <Input id="extraSwipedPercent" name="extraSwipedPercent" type="number" step="0.01" min="0" max="100" value={extraSwipedPercent} onChange={(e) => setExtraSwipedPercent(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siteCharges">Site Charges</Label>
                  <Input id="siteCharges" name="siteCharges" type="number" step="0.01" min="0" value={siteCharges} onChange={(e) => setSiteCharges(e.target.value)} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="pendingHeldBy">Pending Held By</Label>
                  <Input id="pendingHeldBy" name="pendingHeldBy" defaultValue={initial?.pendingHeldBy ?? ""} placeholder="Employee name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chargesSentType">Charges Sent As</Label>
                  <Select id="chargesSentType" name="chargesSentType" defaultValue={initial?.chargesSentType ?? ""}>
                    <option value="">— Not yet —</option>
                    {CHARGES_SENT_TYPES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea id="remarks" name="remarks" rows={2} defaultValue={initial?.remarks ?? ""} />
                </div>
              </CardContent>
            </Card>

            {/* ADDED v1.2 — CLEARED Section */}
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-emerald-800">Cleared Section</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={quickFillCleared}>
                  <Wand2 className="h-3 w-3" /> Quick fill cash
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="clearedPhonePe">PhonePe</Label>
                  <Input id="clearedPhonePe" name="clearedPhonePe" type="number" step="0.01" min="0" value={clearedPhonePe} onChange={(e) => setClearedPhonePe(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clearedWallet">Wallet</Label>
                  <Input id="clearedWallet" name="clearedWallet" type="number" step="0.01" min="0" value={clearedWallet} onChange={(e) => setClearedWallet(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clearedCash">Cash</Label>
                  <Input id="clearedCash" name="clearedCash" type="number" step="0.01" min="0" value={clearedCash} onChange={(e) => setClearedCash(e.target.value)} />
                </div>
                <div className="md:col-span-3 space-y-1 rounded-lg bg-white px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Cleared Total</span>
                    <span className="font-mono font-semibold">{formatCurrency(clearedTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Customer Today Pending</span>
                    <span className={`font-mono font-bold ${todayPending > 0.01 ? "text-orange-600" : "text-green-600"}`}>
                      {formatCurrency(todayPending)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    (Paid {formatCurrency(paidTotal)} − Swipe {formatCurrency(swipeTotal)}) − Cleared {formatCurrency(clearedTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            {/* ADDED v1.2 — Dynamic Save button */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isPending || isLocked || !paidRaw}
                className={cn(
                  "flex-1 md:flex-none",
                  isCleared && paidTotal > 0
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-primary-600 hover:bg-primary-700"
                )}
              >
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                ) : isCleared && paidTotal > 0 ? (
                  <><CheckCircle2 className="h-4 w-4" /> {isEdit ? "Update" : "Save"} — PAID — NO DUES</>
                ) : (
                  <><AlertTriangle className="h-4 w-4" /> {isEdit ? "Update" : "Save"} — PENDING</>
                )}
              </Button>
              {isEdit && (
                <Button type="button" variant="outline" onClick={() => router.push("/transactions/payments")}>
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* RIGHT-SIDE SUMMARY PANEL */}
          <div>
            <Card className="sticky top-20 border-primary-200 bg-gradient-to-br from-primary-50/50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary-600" /> Live Calculation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2.5 text-sm">
                  <Row label="Paid (Total)" value={formatCurrency(paidTotal)} bold />
                  <Row label="Swipe (Total)" value={formatCurrency(swipeTotal)} />
                  <Separator />
                  <Row label={`Charges (${parseFloat(percentage || "0").toFixed(2)}%)`} value={formatCurrency(parseFloat(charges) || 0)} highlight />
                  <Row label="Pending After Payment" value={formatCurrency(pendingAfterPayment)} />
                  <Separator />
                  <Row label="Cleared PhonePe" value={formatCurrency(clearedPhonePeNum)} />
                  <Row label="Cleared Wallet" value={formatCurrency(clearedWalletNum)} />
                  <Row label="Cleared Cash" value={formatCurrency(clearedCashNum)} />
                  <Row label="Cleared Total" value={formatCurrency(clearedTotal)} bold />
                  <Separator />
                  <div className={cn(
                    "rounded-lg border-2 p-3 text-center transition-colors",
                    isCleared && paidTotal > 0
                      ? "border-green-300 bg-green-50"
                      : "border-orange-300 bg-orange-50"
                  )}>
                    <p className="text-[10px] uppercase font-semibold text-slate-500">Customer Today Pending</p>
                    <p className={cn(
                      "mt-1 font-mono text-2xl font-bold tabular-nums",
                      isCleared && paidTotal > 0 ? "text-green-700" : "text-orange-700"
                    )}>
                      {formatCurrency(todayPending)}
                    </p>
                    <p className="mt-1 text-xs font-semibold">
                      {isCleared && paidTotal > 0 ? "✅ FULLY CLEARED" : "⚠ PENDING"}
                    </p>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </fieldset>
      </form>

      {/* ADDED v1.2 — Success popup with copy + WhatsApp */}
      {showSuccess && successData && (
        <SuccessCopyPopup
          open={showSuccess}
          onClose={() => {
            setShowSuccess(false);
            router.push("/transactions/payments");
            router.refresh();
          }}
          customerName={successData.customerName}
          customerMobile={successData.customerMobile}
          paidAmount={successData.paidAmount}
          cardLabel={successData.cardLabel}
          date={successData.date}
          companyName={companyName}
          transactionId={successData.transactionId}
          template={whatsappTemplate}
        />
      )}
    </>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-600">{label}</dt>
      <dd
        className={`font-mono tabular-nums ${bold ? "font-bold" : "font-medium"} ${
          highlight ? "text-primary-700" : "text-slate-900"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
