"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCard } from "@/actions/card.actions";
import { BANK_NAMES } from "@/lib/constants";

export function CardForm({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("profileId", profileId);

    startTransition(async () => {
      const r = await createCard(fd);
      if (!r.success) {
        setError(r.error ?? "Failed");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Card added");
      router.refresh();
      (e.target as HTMLFormElement).reset();
    });
  }

  const currentYear = new Date().getFullYear();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Card</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="holderName">Card Holder Name *</Label>
            <Input id="holderName" name="holderName" required minLength={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holderMobile">Holder Mobile *</Label>
            <Input id="holderMobile" name="holderMobile" required pattern="\d{10}" maxLength={10} inputMode="numeric" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank *</Label>
            <Select id="bankName" name="bankName" required defaultValue="HDFC">
              {BANK_NAMES.map((b) => (
                <option key={b} value={b}>{b.replace(/_/g, " ")}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardNetwork">Network *</Label>
            <Select id="cardNetwork" name="cardNetwork" required defaultValue="VISA">
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

          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number (15-16 digits) *</Label>
            <Input id="cardNumber" name="cardNumber" required pattern="\d{15,16}" maxLength={16} inputMode="numeric" placeholder="**** **** **** ****" />
          </div>

          <div className="grid grid-cols-2 gap-3 md:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="cardExpireMonth">Expiry Month *</Label>
              <Select id="cardExpireMonth" name="cardExpireMonth" required>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardExpireYear">Expiry Year *</Label>
              <Select id="cardExpireYear" name="cardExpireYear" required>
                {Array.from({ length: 10 }, (_, i) => currentYear + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cvv">CVV (optional, hashed)</Label>
            <Input id="cvv" name="cvv" pattern="\d{3,4}" maxLength={4} inputMode="numeric" placeholder="•••" />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
              {error}
            </div>
          )}

          <div className="md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</> : "Add Card"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
