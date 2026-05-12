"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, Star, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PhotoUpload } from "@/components/shared/PhotoUpload";
import { createCard } from "@/actions/card.actions";
import { BANK_NAMES } from "@/lib/constants";
import { detectCardNetwork, expectedCardLength, isCardExpired, formatCardNumberDisplay } from "@/lib/calc-shared";

interface AddCardDialogProps {
  profileId: string;
  profileName: string;
  profileMobile: string;
  autoOpenOnQuery?: boolean;
}

export function AddCardDialog({
  profileId,
  profileName,
  profileMobile,
  autoOpenOnQuery = true,
}: AddCardDialogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ADDED v1.2 — controlled fields for live behavior
  const [bankName, setBankName] = useState("HDFC");
  const [bankNameOther, setBankNameOther] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardNetwork, setCardNetwork] = useState("VISA");
  const [networkAutoDetected, setNetworkAutoDetected] = useState(false);
  const [expireMonth, setExpireMonth] = useState<number>(new Date().getMonth() + 1);
  const [expireYear, setExpireYear] = useState<number>(new Date().getFullYear());
  const [aadharFrontUrl, setAadharFrontUrl] = useState("");
  const [aadharBackUrl, setAadharBackUrl] = useState("");
  const [cardFrontUrl, setCardFrontUrl] = useState("");
  const [cardBackUrl, setCardBackUrl] = useState("");

  useEffect(() => {
    if (autoOpenOnQuery && searchParams.get("addCard") === "1") {
      setOpen(true);
    }
  }, [searchParams, autoOpenOnQuery]);

  // ADDED v1.2 — Auto-detect network from card number prefix
  useEffect(() => {
    const clean = cardNumber.replace(/\D/g, "");
    if (clean.length >= 2) {
      const detected = detectCardNetwork(clean);
      if (detected && detected !== cardNetwork) {
        setCardNetwork(detected);
        setNetworkAutoDetected(true);
      }
    }
  }, [cardNumber, cardNetwork]);

  const expectedLengths = expectedCardLength(cardNetwork);
  const cleanCardNumber = cardNumber.replace(/\D/g, "");
  const cardLengthWarning =
    cleanCardNumber.length > 0 &&
    cleanCardNumber.length === Math.max(...expectedLengths) &&
    !expectedLengths.includes(cleanCardNumber.length)
      ? `${cardNetwork} cards must be ${expectedLengths.join(" or ")} digits`
      : null;

  const expiryWarning =
    isCardExpired(expireMonth, expireYear) ? "This card has already expired" : null;

  const currentYear = new Date().getFullYear();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("profileId", profileId);
    fd.set("cardNumber", cleanCardNumber);
    fd.set("aadharFrontUrl", aadharFrontUrl);
    fd.set("aadharBackUrl", aadharBackUrl);
    fd.set("cardFrontUrl", cardFrontUrl);
    fd.set("cardBackUrl", cardBackUrl);

    startTransition(async () => {
      const r = await createCard(fd);
      if (!r.success) {
        setError(r.error ?? "Failed");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Card added");
      setOpen(false);
      // Reset
      setCardNumber("");
      setBankNameOther("");
      router.replace(`/profiles/${profileId}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add Card
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add a new card</DialogTitle>
          <DialogDescription>
            Adding a card for <strong>{profileName}</strong> ({profileMobile})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="holderName">Card Holder Name *</Label>
            <Input id="holderName" name="holderName" required minLength={2} defaultValue={profileName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holderMobile">Holder Mobile *</Label>
            <Input
              id="holderMobile"
              name="holderMobile"
              required
              pattern="[6-9]\d{9}"
              maxLength={10}
              inputMode="numeric"
              defaultValue={profileMobile}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank *</Label>
            <Select id="bankName" name="bankName" required value={bankName} onChange={(e) => setBankName(e.target.value)}>
              {BANK_NAMES.map((b) => (
                <option key={b} value={b}>{b.replace(/_/g, " ")}</option>
              ))}
            </Select>
          </div>

          {/* ADDED v1.2 — Manual bank name field shown when "OTHER" selected */}
          {bankName === "OTHER" && (
            <div className="space-y-2">
              <Label htmlFor="bankNameOther">Bank Name (manual) *</Label>
              <Input
                id="bankNameOther"
                name="bankNameOther"
                required
                value={bankNameOther}
                onChange={(e) => setBankNameOther(e.target.value)}
                placeholder="Enter bank name"
                maxLength={80}
              />
            </div>
          )}

          <div className={bankName === "OTHER" ? "space-y-2 md:col-span-2" : "space-y-2"}>
            <Label htmlFor="cardNumber">Card Number *</Label>
            <Input
              id="cardNumber"
              name="cardNumber-display"
              required
              inputMode="numeric"
              value={formatCardNumberDisplay(cardNumber)}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
              placeholder="•••• •••• •••• ••••"
            />
            {cleanCardNumber.length > 0 && (
              <p className="text-[11px] text-slate-500">
                {cleanCardNumber.length} / {expectedLengths.join(" or ")} digits
                {networkAutoDetected && (
                  <span className="ml-2 text-primary-600">· network auto-detected: {cardNetwork.replace(/_/g, " ")}</span>
                )}
              </p>
            )}
            {cardLengthWarning && (
              <p className="inline-flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" /> {cardLengthWarning}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardNetwork">Network *</Label>
            <Select id="cardNetwork" name="cardNetwork" required value={cardNetwork} onChange={(e) => { setCardNetwork(e.target.value); setNetworkAutoDetected(false); }}>
              <option value="VISA">Visa (2.5%)</option>
              <option value="RUPAY">RuPay (3.0%)</option>
              <option value="MASTERCARD">MasterCard (3.0%)</option>
              <option value="HDFC_RUPAY">HDFC RuPay (3.5%)</option>
              <option value="HDFC_MASTER">HDFC MasterCard (3.5%)</option>
              <option value="DINERS_CLUB">Diners Club (3.5%)</option>
              <option value="AMERICAN_EXPRESS">American Express (4.0%)</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardType">Card Type *</Label>
            <Select id="cardType" name="cardType" required defaultValue="DOMESTIC">
              <option value="DOMESTIC">Domestic</option>
              <option value="BUSINESS">Business</option>
              <option value="INTERNATIONAL">International</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 md:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="cardExpireMonth">Expiry Month *</Label>
              <Select
                id="cardExpireMonth"
                name="cardExpireMonth"
                required
                value={expireMonth}
                onChange={(e) => setExpireMonth(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardExpireYear">Expiry Year *</Label>
              <Select
                id="cardExpireYear"
                name="cardExpireYear"
                required
                value={expireYear}
                onChange={(e) => setExpireYear(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 12 }, (_, i) => currentYear + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
          </div>

          {expiryWarning && (
            <div className="md:col-span-2 inline-flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
              <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" /> {expiryWarning}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cvv">CVV (optional, hashed)</Label>
            <Input
              id="cvv"
              name="cvv"
              pattern={cardNetwork === "AMERICAN_EXPRESS" ? "\\d{4}" : "\\d{3,4}"}
              maxLength={cardNetwork === "AMERICAN_EXPRESS" ? 4 : 4}
              inputMode="numeric"
              placeholder={cardNetwork === "AMERICAN_EXPRESS" ? "4 digits" : "3 digits"}
            />
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              id="isPrimary"
              name="isPrimary"
              value="true"
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <Label htmlFor="isPrimary" className="inline-flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 text-amber-500" /> Mark as primary card for this customer
            </Label>
          </div>

          {/* ADDED v1.2 — Card photos (front + back), camera or gallery */}
          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Card Photos (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <PhotoUpload
                name="cardFrontUrl"
                label="Card Front"
                defaultUrl={cardFrontUrl}
                onUploaded={(url) => setCardFrontUrl(url)}
              />
              <PhotoUpload
                name="cardBackUrl"
                label="Card Back"
                defaultUrl={cardBackUrl}
                onUploaded={(url) => setCardBackUrl(url)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !!expiryWarning}>
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</> : "Add Card"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
