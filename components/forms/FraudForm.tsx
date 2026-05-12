"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldAlert, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUpload } from "@/components/shared/PhotoUpload";
import { createFraud } from "@/actions/fraud.actions";
import { BANK_NAMES } from "@/lib/constants";

export function FraudForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cardFrontPhotoUrl, setCardFrontPhotoUrl] = useState("");
  const [cardBackPhotoUrl, setCardBackPhotoUrl] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("cardFrontPhotoUrl", cardFrontPhotoUrl);
    fd.set("cardBackPhotoUrl", cardBackPhotoUrl);

    startTransition(async () => {
      const r = await createFraud(fd);
      if (!r.success) {
        setError(r.error ?? "Failed");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Fraud entry recorded");
      router.refresh();
      (e.target as HTMLFormElement).reset();
      setCardFrontPhotoUrl("");
      setCardBackPhotoUrl("");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600" /> Report Fraud
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile *</Label>
            <Input id="mobile" name="mobile" required pattern="\d{10}" maxLength={10} inputMode="numeric" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input id="name" name="name" />
          </div>

          <div className="md:col-span-2 mt-2 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-amber-800">
              Card Details (optional, encrypted)
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cardBankName">Bank</Label>
                <Select id="cardBankName" name="cardBankName" defaultValue="">
                  <option value="">— Select bank —</option>
                  {BANK_NAMES.map((b) => <option key={b} value={b}>{b.replace(/_/g, " ")}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number (4-16 digits)</Label>
                <Input
                  id="cardNumber"
                  name="cardNumber"
                  inputMode="numeric"
                  maxLength={16}
                  pattern="\d{4,16}"
                  placeholder="full number or last 4"
                />
                <p className="text-[11px] text-slate-500">Stored encrypted at rest</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cardExpiry">Expiry (MM/YYYY)</Label>
                <Input id="cardExpiry" name="cardExpiry" placeholder="12/2027" pattern="\d{2}/\d{4}" maxLength={7} />
              </div>
              <div className="md:col-span-2 inline-flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span>
                  CVV is intentionally <strong>not stored</strong> — even encrypted CVV storage is prohibited under
                  every card-handling regulation.
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <PhotoUpload
                name="cardFrontPhotoUrl"
                label="Card Front Photo"
                defaultUrl={cardFrontPhotoUrl}
                onUploaded={(url) => setCardFrontPhotoUrl(url)}
              />
              <PhotoUpload
                name="cardBackPhotoUrl"
                label="Card Back Photo"
                defaultUrl={cardBackPhotoUrl}
                onUploaded={(url) => setCardBackPhotoUrl(url)}
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cardDetails">Free-text Card Details</Label>
            <Input id="cardDetails" name="cardDetails" placeholder="e.g. HDFC ****1234 — additional notes" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" name="remarks" rows={3} />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{error}</div>
          )}
          <div className="md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Fraud Entry"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
